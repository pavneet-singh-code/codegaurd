const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, pageInfo } = require('../utils/pagination');

// Loads an assignment and enforces ownership when the caller is a professor.
async function getAssignmentFor(user, id, { ownerOnly = false } = {}) {
  const assignment = await Assignment.findById(id);
  if (!assignment) throw ApiError.notFound('Assignment not found');
  const isOwner = user.role === 'PROFESSOR' && assignment.professor.equals(user._id);
  if (user.role === 'PROFESSOR' && !isOwner) throw ApiError.forbidden('You can only access your own assignments');
  if (ownerOnly && !isOwner) throw ApiError.forbidden('Only the owning professor can do that');
  return assignment;
}

const pickFields = (body) => {
  const out = {};
  for (const k of ['title', 'description', 'programmingLanguage', 'deadline', 'allowLateSubmissions']) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
};

exports.getAssignmentFor = getAssignmentFor;

// Express middleware used by the submission routes.
exports.loadAssignment = asyncHandler(async (req, _res, next) => {
  req.assignment = await getAssignmentFor(req.user, req.params.id);
  next();
});

exports.create = asyncHandler(async (req, res) => {
  const assignment = await Assignment.create({ ...pickFields(req.body), professor: req.user._id });
  res.status(201).json({ assignment });
});

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.user.role === 'PROFESSOR') filter.professor = req.user._id;
  if (['OPEN', 'CLOSED'].includes(req.query.status)) filter.status = req.query.status;
  const [items, total] = await Promise.all([
    Assignment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('professor', 'name'),
    Assignment.countDocuments(filter),
  ]);
  // submissionCount = number of students whose latest version is on file for each assignment.
  const counts = await Submission.aggregate([
    { $match: { assignment: { $in: items.map((a) => a._id) }, status: 'SUBMITTED' } },
    { $group: { _id: '$assignment', n: { $sum: 1 } } },
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.n]));
  const assignments = items.map((a) => ({ ...a.toJSON(), submissionCount: byId.get(String(a._id)) || 0 }));
  res.json({ assignments, pagination: pageInfo(page, limit, total) });
});

exports.get = asyncHandler(async (req, res) => {
  const assignment = await getAssignmentFor(req.user, req.params.id);
  await assignment.populate('professor', 'name');
  const submissionCount = await Submission.countDocuments({ assignment: assignment._id, status: 'SUBMITTED' });
  res.json({ assignment: { ...assignment.toJSON(), submissionCount } });
});

exports.update = asyncHandler(async (req, res) => {
  const assignment = await getAssignmentFor(req.user, req.params.id, { ownerOnly: true });
  const changes = pickFields(req.body);
  if (changes.programmingLanguage && changes.programmingLanguage !== assignment.programmingLanguage
      && (await Submission.exists({ assignment: assignment._id }))) {
    throw ApiError.conflict('The language cannot change after submissions exist', 'LANGUAGE_LOCKED');
  }
  assignment.set(changes);
  await assignment.save();
  res.json({ assignment });
});

exports.close = asyncHandler(async (req, res) => {
  const assignment = await getAssignmentFor(req.user, req.params.id, { ownerOnly: true });
  assignment.status = 'CLOSED';
  await assignment.save();
  res.json({ assignment });
});
