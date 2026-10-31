const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Analysis = require('../models/Analysis');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const DAYS = 14;
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

// Submissions per UTC day for the last 14 days (zero-filled so charts have no gaps).
function timeline(dates) {
  const now = new Date();
  const keys = [];
  for (let i = DAYS - 1; i >= 0; i--) keys.push(dayKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i))));
  const counts = new Map(keys.map((k) => [k, 0]));
  for (const d of dates) { const k = dayKey(d); if (counts.has(k)) counts.set(k, counts.get(k) + 1); }
  return keys.map((date) => ({ date, count: counts.get(date) }));
}
const countBy = (items, keyFn) => { const m = new Map(); for (const it of items) { const k = keyFn(it); m.set(k, (m.get(k) || 0) + 1); } return m; };

/** Professor overview. "Latest analysis" = the newest completed analysis of each assignment, so reruns are not double counted. */
exports.professor = asyncHandler(async (req, res) => {
  const assignments = await Assignment.find({ professor: req.user._id }).sort({ createdAt: -1 }).lean();
  const ids = assignments.map((a) => a._id);
  const [subs, analyses] = await Promise.all([
    Submission.find({ assignment: { $in: ids } }).select('assignment student isLate status submittedAt').lean(),
    Analysis.find({ assignment: { $in: ids }, status: 'COMPLETED' }).sort({ createdAt: -1 }).lean(),
  ]);

  const latestAnalysis = new Map(); const runs = new Map();
  for (const a of analyses) {
    const k = String(a.assignment);
    runs.set(k, (runs.get(k) || 0) + 1);
    if (!latestAnalysis.has(k)) latestAnalysis.set(k, a);
  }
  const current = subs.filter((s) => s.status === 'SUBMITTED');
  const currentByAssignment = countBy(current, (s) => String(s.assignment));
  const lateByAssignment = countBy(current.filter((s) => s.isLate), (s) => String(s.assignment));

  const buckets = Array(10).fill(0);
  const pairs = []; const perStudent = new Map();
  for (const a of latestAnalysis.values()) {
    for (const r of a.results) {
      buckets[Math.min(9, Math.floor(r.similarityScore * 10))] += 1;
      pairs.push({ analysisId: a._id, resultId: r._id, assignment: a.assignment, similarityScore: r.similarityScore, status: r.status, studentA: r.studentA, studentB: r.studentB });
      for (const sid of [r.studentA, r.studentB]) {
        const e = perStudent.get(String(sid)) || { highest: 0, flagged: 0 };
        e.highest = Math.max(e.highest, r.similarityScore);
        if (r.status === 'REVIEW_REQUIRED') e.flagged += 1;
        perStudent.set(String(sid), e);
      }
    }
  }
  const maxByAssignment = new Map();
  for (const p of pairs) { const k = String(p.assignment); maxByAssignment.set(k, Math.max(maxByAssignment.get(k) || 0, p.similarityScore)); }

  const byAssignment = assignments.map((a) => {
    const k = String(a._id); const last = latestAnalysis.get(k);
    return {
      _id: a._id, title: a.title, programmingLanguage: a.programmingLanguage, status: a.status, deadline: a.deadline,
      submitted: currentByAssignment.get(k) || 0, late: lateByAssignment.get(k) || 0, analysisCount: runs.get(k) || 0,
      lastAnalysisId: last ? last._id : null, flaggedPairs: last ? last.flaggedPairs : 0, pairsCompared: last ? last.totalPairsCompared : 0,
      maxSimilarity: maxByAssignment.get(k) || 0,
    };
  });

  // Per-student view across this professor's assignments.
  const studentRows = new Map();
  for (const s of subs) {
    const k = String(s.student);
    const e = studentRows.get(k) || { assignments: new Set(), versions: 0, late: 0 };
    e.assignments.add(String(s.assignment)); e.versions += 1;
    if (s.status === 'SUBMITTED' && s.isLate) e.late += 1;
    studentRows.set(k, e);
  }
  const titleById = new Map(assignments.map((a) => [String(a._id), a.title]));
  const userIds = [...new Set([...studentRows.keys(), ...pairs.flatMap((p) => [String(p.studentA), String(p.studentB)])])];
  const users = await User.find({ _id: { $in: userIds } }).select('name email').lean();
  const userById = new Map(users.map((u) => [String(u._id), u]));

  const students = [...studentRows.entries()].map(([id, e]) => {
    const u = userById.get(id) || {}; const sim = perStudent.get(id) || { highest: 0, flagged: 0 };
    return { _id: id, name: u.name || 'Unknown', email: u.email || '', assignments: e.assignments.size, versions: e.versions, late: e.late, highestSimilarity: sim.highest, flaggedPairs: sim.flagged };
  }).sort((a, b) => b.highestSimilarity - a.highestSimilarity || a.name.localeCompare(b.name));

  const topPairs = pairs.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, 6).map((p) => ({
    ...p, assignmentTitle: titleById.get(String(p.assignment)),
    studentA: userById.get(String(p.studentA))?.name, studentB: userById.get(String(p.studentB))?.name,
  }));

  res.json({
    totals: {
      assignments: assignments.length, open: assignments.filter((a) => a.status === 'OPEN').length, closed: assignments.filter((a) => a.status === 'CLOSED').length,
      students: studentRows.size, submissions: subs.length, latestSubmissions: current.length, lateSubmissions: current.filter((s) => s.isLate).length,
      analysesRun: analyses.length, pairsCompared: [...latestAnalysis.values()].reduce((n, a) => n + a.totalPairsCompared, 0),
      flaggedPairs: [...latestAnalysis.values()].reduce((n, a) => n + a.flaggedPairs, 0),
    },
    byAssignment,
    timeline: timeline(subs.map((s) => s.submittedAt)),
    languageSplit: { java: assignments.filter((a) => a.programmingLanguage === 'java').length, python: assignments.filter((a) => a.programmingLanguage === 'python').length },
    similarityBuckets: buckets.map((count, i) => ({ from: i / 10, to: (i + 1) / 10, count })),
    topPairs,
    students,
  });
});

/** Student overview: deadlines, progress and activity. Contains nothing about similarity results. */
exports.student = asyncHandler(async (req, res) => {
  const [assignments, mine] = await Promise.all([
    Assignment.find().sort({ deadline: 1 }).lean(),
    Submission.find({ student: req.user._id }).sort({ submittedAt: -1 }).lean(),
  ]);
  const now = Date.now();
  const byAssignment = new Map();
  for (const s of mine) { const k = String(s.assignment); if (!byAssignment.has(k)) byAssignment.set(k, []); byAssignment.get(k).push(s); }

  const rows = assignments.map((a) => {
    const list = byAssignment.get(String(a._id)) || []; const latest = list[0];
    const state = list.length ? 'SUBMITTED' : (a.status === 'CLOSED' || new Date(a.deadline).getTime() < now ? 'MISSED' : 'PENDING');
    return {
      _id: a._id, title: a.title, programmingLanguage: a.programmingLanguage, status: a.status, deadline: a.deadline,
      versions: list.length, submitted: list.length > 0, lastSubmittedAt: latest ? latest.submittedAt : null, isLate: latest ? latest.isLate : false, state,
    };
  });
  const submitted = rows.filter((r) => r.submitted);
  const late = submitted.filter((r) => r.isLate).length;
  const titleById = new Map(assignments.map((a) => [String(a._id), a.title]));

  res.json({
    totals: {
      assignments: rows.length, open: rows.filter((r) => r.status === 'OPEN').length, submitted: submitted.length,
      pending: rows.filter((r) => r.state === 'PENDING').length, missed: rows.filter((r) => r.state === 'MISSED').length,
      versions: mine.length, lateSubmissions: late,
      onTimeRate: submitted.length ? Math.round(((submitted.length - late) / submitted.length) * 10000) / 10000 : null,
      avgVersions: submitted.length ? Math.round((mine.length / submitted.length) * 10) / 10 : 0,
    },
    assignments: rows,
    upcoming: rows.filter((r) => r.state === 'PENDING').slice(0, 5),
    recent: mine.slice(0, 5).map((s) => ({ _id: s._id, assignment: s.assignment, title: titleById.get(String(s.assignment)), version: s.version, originalFilename: s.originalFilename, submittedAt: s.submittedAt, isLate: s.isLate })),
    timeline: timeline(mine.map((s) => s.submittedAt)),
  });
});
