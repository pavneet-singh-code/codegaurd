const Analysis = require('../models/Analysis');
const Submission = require('../models/Submission');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, pageInfo } = require('../utils/pagination');
const { toCsv } = require('../utils/csv');
const fileStorage = require('../services/fileStorage');
const { runAnalysis } = require('../services/analysisService');
const { explainPair } = require('../services/plagiarism');
const { getAssignmentFor } = require('./assignmentController');
const env = require('../config/env');

async function loadOwnedAnalysis(user, id) {
  const analysis = await Analysis.findById(id);
  if (!analysis) throw ApiError.notFound('Analysis not found');
  if (!analysis.requestedBy.equals(user._id)) {
    // Also covers a professor who is not the assignment owner.
    throw ApiError.forbidden('You can only view your own analyses');
  }
  return analysis;
}

exports.start = asyncHandler(async (req, res) => {
  const assignment = await getAssignmentFor(req.user, req.params.id, { ownerOnly: true });
  const { threshold, kgramSize, windowSize } = req.body;
  const analysis = await runAnalysis({
    assignment, requestedBy: req.user._id,
    threshold: threshold ?? env.defaultThreshold, kgramSize, windowSize,
  });
  const summary = analysis.toJSON(); delete summary.results;
  res.status(201).json({ analysis: summary });
});

exports.get = asyncHandler(async (req, res) => {
  const analysis = await Analysis.findById(req.params.id).select('-results').populate('assignment', 'title programmingLanguage');
  if (!analysis) throw ApiError.notFound('Analysis not found');
  if (!analysis.requestedBy.equals(req.user._id)) throw ApiError.forbidden('You can only view your own analyses');
  res.json({ analysis });
});

exports.listForAssignment = asyncHandler(async (req, res) => {
  await getAssignmentFor(req.user, req.params.id, { ownerOnly: true });
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { assignment: req.params.id, requestedBy: req.user._id };
  const [analyses, total] = await Promise.all([
    Analysis.find(filter).select('-results').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Analysis.countDocuments(filter),
  ]);
  res.json({ analyses, pagination: pageInfo(page, limit, total) });
});

exports.listRecent = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 5 });
  const filter = { requestedBy: req.user._id };
  const [analyses, total] = await Promise.all([
    Analysis.find(filter).select('-results').sort({ createdAt: -1 }).skip(skip).limit(limit).populate('assignment', 'title'),
    Analysis.countDocuments(filter),
  ]);
  res.json({ analyses, pagination: pageInfo(page, limit, total) });
});

exports.results = asyncHandler(async (req, res) => {
  const analysis = await loadOwnedAnalysis(req.user, req.params.id);
  await analysis.populate([{ path: 'results.studentA', select: 'name email' }, { path: 'results.studentB', select: 'name email' },
    { path: 'results.submissionA', select: 'version originalFilename isLate' }, { path: 'results.submissionB', select: 'version originalFilename isLate' }]);

  let rows = analysis.results.map((r) => r.toJSON());
  const min = parseFloat(req.query.threshold);
  if (Number.isFinite(min)) rows = rows.filter((r) => r.similarityScore >= min); // filter by threshold
  if (['REVIEW_REQUIRED', 'NOT_FLAGGED'].includes(req.query.status)) rows = rows.filter((r) => r.status === req.query.status);
  const key = ['similarityScore', 'jaccard', 'coverageA', 'coverageB', 'sharedFingerprintCount'].includes(req.query.sort) ? req.query.sort : 'similarityScore';
  const dir = req.query.order === 'asc' ? 1 : -1;
  rows.sort((a, b) => (a[key] - b[key]) * dir);

  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 25 });
  res.json({
    analysis: { _id: analysis._id, threshold: analysis.threshold, status: analysis.status, flaggedPairs: analysis.flaggedPairs, totalPairsCompared: analysis.totalPairsCompared },
    results: rows.slice(skip, skip + limit),
    pagination: pageInfo(page, limit, rows.length),
  });
});

// Matching regions + source excerpts for one pair. Recomputed from the stored files with the
// parameters saved on the analysis, so every line range is derived from real tokens.
exports.pairDetail = asyncHandler(async (req, res) => {
  const analysis = await loadOwnedAnalysis(req.user, req.params.id);
  const result = analysis.results.id(req.params.resultId);
  if (!result) throw ApiError.notFound('Result not found');
  const [subA, subB] = await Promise.all([Submission.findById(result.submissionA).populate('student', 'name email'),
    Submission.findById(result.submissionB).populate('student', 'name email')]);
  if (!subA || !subB) throw ApiError.notFound('Submission no longer exists');
  const [textA, textB] = await Promise.all([fileStorage.readText(subA.filePath), fileStorage.readText(subB.filePath)]);
  const info = explainPair(textA, textB, subA.programmingLanguage, analysis.parameters);

  const linesA = textA.replace(/\r\n?/g, '\n').split('\n'); const linesB = textB.replace(/\r\n?/g, '\n').split('\n');
  const excerpt = (lines, from, to) => lines.slice(from - 1, Math.min(to, from + 59)).join('\n'); // cap at 60 lines
  const regions = info.regions.map((r) => ({
    tokenCount: r.tokenCount, aTokenStart: r.aTokenStart, bTokenStart: r.bTokenStart,
    a: { startLine: r.aStartLine, endLine: r.aEndLine, excerpt: excerpt(linesA, r.aStartLine, r.aEndLine) },
    b: { startLine: r.bStartLine, endLine: r.bEndLine, excerpt: excerpt(linesB, r.bStartLine, r.bEndLine) },
  }));
  res.json({
    result: result.toJSON(),
    studentA: subA.student, studentB: subB.student,
    summary: { totalRegions: info.totalRegions, matchedTokensA: info.matchedTokensA, matchedTokensB: info.matchedTokensB, tokenCountA: info.tokenCountA, tokenCountB: info.tokenCountB },
    regions,
    note: 'Similar code can arise independently, especially for short or highly constrained assignments. Review the code before drawing conclusions.',
  });
});

exports.csv = asyncHandler(async (req, res) => {
  const analysis = await loadOwnedAnalysis(req.user, req.params.id);
  await analysis.populate([{ path: 'assignment', select: 'title' }, { path: 'results.studentA', select: 'name email' }, { path: 'results.studentB', select: 'name email' },
    { path: 'results.submissionA', select: 'version' }, { path: 'results.submissionB', select: 'version' }]);
  const pct = (x) => (x * 100).toFixed(2);
  const rows = [['Assignment', 'Student A', 'Email A', 'Version A', 'Student B', 'Email B', 'Version B', 'Similarity %', 'Jaccard %', 'Coverage A %', 'Coverage B %', 'Shared fingerprints', 'Threshold %', 'Status']];
  for (const r of analysis.results) {
    rows.push([analysis.assignment.title, r.studentA.name, r.studentA.email, r.submissionA.version, r.studentB.name, r.studentB.email, r.submissionB.version,
      pct(r.similarityScore), pct(r.jaccard), pct(r.coverageA), pct(r.coverageB), r.sharedFingerprintCount, pct(analysis.threshold), r.status]);
  }
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="analysis-${analysis._id}.csv"`);
  res.send(toCsv(rows));
});
