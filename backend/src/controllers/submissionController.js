const path = require('path');
const crypto = require('crypto');
const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, pageInfo } = require('../utils/pagination');
const fileStorage = require('../services/fileStorage');
const { ALLOWED } = require('../middleware/upload');

// Runs BEFORE the upload middleware so rejected students never cost us a file parse.
exports.ensureAcceptingSubmissions = (req, _res, next) => {
  const a = req.assignment;
  if (a.status === 'CLOSED') return next(ApiError.conflict('This assignment is closed', 'ASSIGNMENT_CLOSED'));
  if (Date.now() > a.deadline.getTime() && !a.allowLateSubmissions) {
    return next(new ApiError(403, 'DEADLINE_PASSED', 'The deadline has passed and late submissions are not allowed'));
  }
  next();
};

const cleanName = (n) => path.basename(String(n)).replace(/[^\w.\- ]/g, '_').slice(0, 120);

exports.create = asyncHandler(async (req, res) => {
  const assignment = req.assignment;
  const file = req.file;
  if (!file) throw ApiError.badRequest('A source-code file is required (multipart field "file")', 'FILE_REQUIRED');

  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED[ext] !== assignment.programmingLanguage) {
    throw new ApiError(415, 'WRONG_LANGUAGE', `This assignment expects ${assignment.programmingLanguage} files`);
  }
  // Must be non-empty, valid UTF-8 text without NUL bytes (i.e. not a renamed binary).
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(file.buffer); } catch { text = null; }
  if (text === null || text.includes('\0') || !text.trim()) {
    throw ApiError.badRequest('The file must be non-empty UTF-8 source code', 'INVALID_FILE_CONTENT');
  }

  // Server clock decides lateness; the client cannot influence it.
  const submittedAt = new Date();
  const isLate = submittedAt > assignment.deadline;
  const contentHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
  const latest = await Submission.findOne({ assignment: assignment._id, student: req.user._id }).sort({ version: -1 });
  if (latest && latest.contentHash === contentHash) {
    throw ApiError.conflict(`This file is identical to your latest submission (version ${latest.version})`, 'DUPLICATE_SUBMISSION');
  }

  const stored = await fileStorage.save(file.buffer, {
    assignmentId: assignment._id, studentId: req.user._id, extension: ext,
  });
  let submission;
  try {
    submission = await Submission.create({
      assignment: assignment._id, student: req.user._id, version: (latest ? latest.version : 0) + 1,
      originalFilename: cleanName(file.originalname), storedFilename: stored.storedFilename, filePath: stored.relativePath,
      contentHash, programmingLanguage: assignment.programmingLanguage, submittedAt, isLate,
    });
  } catch (err) {
    await fileStorage.remove(stored.relativePath);
    if (err.code === 11000) throw ApiError.conflict('Another upload was processed at the same time, please retry', 'VERSION_CONFLICT');
    throw err;
  }
  await Submission.updateMany(
    { assignment: assignment._id, student: req.user._id, version: { $lt: submission.version } },
    { status: 'SUPERSEDED' }
  );
  res.status(201).json({ submission });
});

exports.listForAssignment = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { assignment: req.assignment._id };
  if (req.user.role === 'STUDENT') filter.student = req.user._id; // students only ever see their own history
  else if (req.query.allVersions !== 'true') filter.status = 'SUBMITTED'; // professors default to the latest per student
  const [submissions, total] = await Promise.all([
    Submission.find(filter).sort({ submittedAt: -1 }).skip(skip).limit(limit).populate('student', 'name email'),
    Submission.countDocuments(filter),
  ]);
  res.json({ submissions, pagination: pageInfo(page, limit, total) });
});

exports.listMine = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { student: req.user._id };
  const [submissions, total] = await Promise.all([
    Submission.find(filter).sort({ submittedAt: -1 }).skip(skip).limit(limit).populate('assignment', 'title deadline status'),
    Submission.countDocuments(filter),
  ]);
  res.json({ submissions, pagination: pageInfo(page, limit, total) });
});

// Owner student or the professor who owns the assignment. Anyone else gets 403.
async function loadAccessible(user, id) {
  const submission = await Submission.findById(id);
  if (!submission) throw ApiError.notFound('Submission not found');
  if (user.role === 'STUDENT') {
    if (!submission.student.equals(user._id)) throw ApiError.forbidden('You can only view your own submissions');
  } else {
    const assignment = await Assignment.findById(submission.assignment);
    if (!assignment || !assignment.professor.equals(user._id)) throw ApiError.forbidden('Not your assignment');
  }
  return submission;
}

exports.get = asyncHandler(async (req, res) => {
  const submission = await loadAccessible(req.user, req.params.id);
  await submission.populate([{ path: 'student', select: 'name email' }, { path: 'assignment', select: 'title' }]);
  const content = await fileStorage.readText(submission.filePath);
  res.json({ submission: { ...submission.toJSON(), content } });
});

exports.versions = asyncHandler(async (req, res) => {
  const submission = await loadAccessible(req.user, req.params.id);
  const versions = await Submission.find({ assignment: submission.assignment, student: submission.student }).sort({ version: -1 });
  res.json({ versions });
});
