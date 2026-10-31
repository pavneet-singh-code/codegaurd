const Analysis = require('../models/Analysis');
const Submission = require('../models/Submission');
const ApiError = require('../utils/ApiError');
const fileStorage = require('./fileStorage');
const { comparePairs, defaults } = require('./plagiarism');

/** Latest version per student (older versions are never treated as separate students). */
async function latestSubmissionPerStudent(assignmentId) {
  const all = await Submission.find({ assignment: assignmentId }).sort({ version: -1 });
  const seen = new Set();
  return all.filter((s) => { const k = String(s.student); if (seen.has(k)) return false; seen.add(k); return true; });
}

/**
 * Runs a full analysis synchronously. It is written as a plain async function that takes an
 * assignment and options and returns an Analysis document, so it can later be called from a
 * background worker without touching the detection code.
 */
async function runAnalysis({ assignment, requestedBy, threshold, kgramSize, windowSize }) {
  const base = defaults();
  const parameters = {
    kgramSize: kgramSize ?? base.kgramSize,
    windowSize: windowSize ?? base.windowSize,
    minFingerprints: base.minFingerprints,
  };
  const submissions = await latestSubmissionPerStudent(assignment._id);
  if (submissions.length < 2) {
    throw ApiError.conflict('At least two students must have submitted before an analysis can run', 'NOT_ENOUGH_SUBMISSIONS');
  }

  const analysis = await Analysis.create({
    assignment: assignment._id, requestedBy, threshold, parameters, status: 'RUNNING', totalSubmissions: submissions.length,
  });
  try {
    const entries = [];
    for (const s of submissions) {
      entries.push({ id: String(s._id), language: s.programmingLanguage, text: await fileStorage.readText(s.filePath) });
    }
    const byId = new Map(submissions.map((s) => [String(s._id), s]));
    const pairs = comparePairs(entries, parameters);

    const results = pairs.map((p) => {
      const a = byId.get(p.a); const b = byId.get(p.b);
      return {
        submissionA: a._id, submissionB: b._id, studentA: a.student, studentB: b.student,
        similarityScore: p.similarityScore, jaccard: p.jaccard, coverageA: p.coverageA, coverageB: p.coverageB,
        sharedFingerprintCount: p.sharedFingerprintCount, fingerprintCountA: p.fingerprintCountA, fingerprintCountB: p.fingerprintCountB,
        status: p.similarityScore >= threshold ? 'REVIEW_REQUIRED' : 'NOT_FLAGGED',
      };
    }).sort((x, y) => y.similarityScore - x.similarityScore);

    analysis.results = results;
    analysis.totalPairsCompared = results.length; // n * (n - 1) / 2
    analysis.flaggedPairs = results.filter((r) => r.status === 'REVIEW_REQUIRED').length;
    analysis.status = 'COMPLETED';
    analysis.completedAt = new Date();
    await analysis.save();
    return analysis;
  } catch (err) {
    analysis.status = 'FAILED';
    analysis.errorMessage = 'Analysis failed while reading or comparing submissions';
    await analysis.save();
    throw err;
  }
}

module.exports = { runAnalysis, latestSubmissionPerStudent };
