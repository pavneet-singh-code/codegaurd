const db = require('../helpers/db');
const { app, request, auth, register, createAssignment, submit, fixture } = require('../helpers/api');
const Analysis = require('../../src/models/Analysis');

beforeAll(db.connect);
afterAll(db.close);
beforeEach(db.clear);

const java = (name) => ({ filename: name, content: fixture('java', name) });
let prof; let students; let assignment;

beforeEach(async () => {
  prof = await register('PROFESSOR');
  students = [await register('STUDENT', { name: 'Ana Original' }), await register('STUDENT', { name: 'Ben Renamed' }),
    await register('STUDENT', { name: 'Cy Independent' }), await register('STUDENT', { name: 'Di Different' })];
  assignment = await createAssignment(prof.token);
  // Ana first hands in an unrelated file (v1) then the real one (v2): only v2 may be compared.
  await submit(students[0].token, assignment._id, java('Palindrome_different.java'));
  await submit(students[0].token, assignment._id, java('GradeBook_original.java'));
  await submit(students[1].token, assignment._id, java('GradeBook_renamed.java'));
  await submit(students[2].token, assignment._id, java('GradeBook_independent.java'));
  await submit(students[3].token, assignment._id, java('Palindrome_different.java'));
});

const analyze = (body = {}, token = prof.token, id = assignment._id) => request(app).post(`/api/assignments/${id}/analyze`).set(auth(token)).send(body);

describe('running an analysis', () => {
  test('compares only the latest version per student and stores real computed values', async () => {
    const res = await analyze({ threshold: 0.6 });
    expect(res.status).toBe(201);
    const a = res.body.analysis;
    expect(a).toMatchObject({ status: 'COMPLETED', threshold: 0.6, totalSubmissions: 4, totalPairsCompared: 6 });
    expect(a.results).toBeUndefined();
    expect(a.completedAt).toBeDefined();

    const stored = await Analysis.findById(a._id);
    expect(stored.results).toHaveLength(6);
    const top = stored.results[0];
    expect(top.similarityScore).toBe(1); // Ana (v2) vs Ben: renamed copy
    expect([String(top.studentA), String(top.studentB)].sort()).toEqual([students[0].user._id, students[1].user._id].sort());
    expect(top.status).toBe('REVIEW_REQUIRED');
    expect(top.sharedFingerprintCount).toBeGreaterThan(50);
    // v1 (Palindrome) was ignored, so Ana vs Di must be low, not 1.
    const anaDi = stored.results.find((r) => [String(r.studentA), String(r.studentB)].includes(students[0].user._id) && [String(r.studentA), String(r.studentB)].includes(students[3].user._id));
    expect(anaDi.similarityScore).toBeLessThan(0.3);
    expect(stored.results.every((r) => ['REVIEW_REQUIRED', 'NOT_FLAGGED'].includes(r.status))).toBe(true);
    expect(a.flaggedPairs).toBe(stored.results.filter((r) => r.similarityScore >= 0.6).length);
    expect(a.flaggedPairs).toBe(1);
  });
  test('the threshold is configurable and stored with the analysis', async () => {
    const strict = await analyze({ threshold: 1 }); const loose = await analyze({ threshold: 0.1 });
    expect(strict.body.analysis.flaggedPairs).toBe(1);
    expect(loose.body.analysis.flaggedPairs).toBeGreaterThan(1);
    expect(loose.body.analysis.threshold).toBe(0.1);
  });
  test('validates parameters', async () => {
    expect((await analyze({ threshold: 1.5 })).status).toBe(422);
    expect((await analyze({ kgramSize: 1 })).status).toBe(422);
  });
  test('needs at least two students', async () => {
    const lonely = await createAssignment(prof.token, { title: 'Lonely' });
    await submit(students[0].token, lonely._id, java('GradeBook_original.java'));
    const res = await analyze({}, prof.token, lonely._id);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NOT_ENOUGH_SUBMISSIONS');
  });
  test('only the owning professor can analyse', async () => {
    const other = await register('PROFESSOR');
    expect((await analyze({}, other.token)).status).toBe(403);
    expect((await analyze({}, students[0].token)).status).toBe(403);
    expect((await request(app).post(`/api/assignments/${assignment._id}/analyze`)).status).toBe(401);
  });
});

describe('reading reports', () => {
  let analysisId;
  beforeEach(async () => { analysisId = (await analyze({ threshold: 0.6 })).body.analysis._id; });

  test('analysis summary and history', async () => {
    const one = await request(app).get(`/api/analyses/${analysisId}`).set(auth(prof.token));
    expect(one.status).toBe(200);
    expect(one.body.analysis.results).toBeUndefined();
    expect(one.body.analysis.assignment.title).toBe('Gradebook');
    await analyze({ threshold: 0.3 });
    const list = await request(app).get(`/api/assignments/${assignment._id}/analyses`).set(auth(prof.token));
    expect(list.body.analyses).toHaveLength(2);
    expect(list.body.analyses[0].threshold).toBe(0.3); // newest first
    const recent = await request(app).get('/api/analyses?limit=1').set(auth(prof.token));
    expect(recent.body.analyses).toHaveLength(1);
    expect(recent.body.pagination.total).toBe(2);
  });
  test('results are sorted by similarity, filterable by threshold and status, and paginated', async () => {
    const all = await request(app).get(`/api/analyses/${analysisId}/results`).set(auth(prof.token));
    const scores = all.body.results.map((r) => r.similarityScore);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(all.body.results[0].studentA.name).toBeDefined();
    expect(all.body.results[0].studentA.password).toBeUndefined();

    const atLeast = await request(app).get(`/api/analyses/${analysisId}/results?threshold=0.9`).set(auth(prof.token));
    expect(atLeast.body.results).toHaveLength(1);
    const flagged = await request(app).get(`/api/analyses/${analysisId}/results?status=REVIEW_REQUIRED`).set(auth(prof.token));
    expect(flagged.body.results.every((r) => r.status === 'REVIEW_REQUIRED')).toBe(true);
    const asc = await request(app).get(`/api/analyses/${analysisId}/results?order=asc`).set(auth(prof.token));
    expect(asc.body.results[0].similarityScore).toBeLessThanOrEqual(asc.body.results[5].similarityScore);
    const paged = await request(app).get(`/api/analyses/${analysisId}/results?limit=2&page=3`).set(auth(prof.token));
    expect(paged.body.results).toHaveLength(2);
    expect(paged.body.pagination).toMatchObject({ page: 3, total: 6, totalPages: 3 });
  });
  test('pair detail returns matching regions whose excerpts come from the real files', async () => {
    const list = await request(app).get(`/api/analyses/${analysisId}/results?limit=1`).set(auth(prof.token));
    const resultId = list.body.results[0]._id;
    const res = await request(app).get(`/api/analyses/${analysisId}/results/${resultId}`).set(auth(prof.token));
    expect(res.status).toBe(200);
    expect(res.body.regions.length).toBeGreaterThan(0);
    expect(res.body.regions[0]).toMatchObject({ aTokenStart: expect.any(Number), bTokenStart: expect.any(Number), tokenCount: expect.any(Number) });
    expect(res.body.note).toMatch(/independently/);
    const original = fixture('java', 'GradeBook_original.java').split('\n');
    const longest = res.body.regions[0];
    const isAna = res.body.studentA._id === students[0].user._id;
    const side = isAna ? longest.a : longest.b;
    expect(side.excerpt).toBe(original.slice(side.startLine - 1, Math.min(side.endLine, side.startLine + 59)).join('\n'));
    expect(res.body.summary.matchedTokensA).toBe(res.body.summary.tokenCountA);
  });
  test('other professors, students and anonymous users cannot read analyses (403/401)', async () => {
    const other = await register('PROFESSOR');
    for (const path of [`/api/analyses/${analysisId}`, `/api/analyses/${analysisId}/results`, `/api/analyses/${analysisId}/report.csv`]) {
      expect((await request(app).get(path).set(auth(other.token))).status).toBe(403);
      expect((await request(app).get(path).set(auth(students[0].token))).status).toBe(403);
      expect((await request(app).get(path)).status).toBe(401);
    }
    expect((await request(app).get(`/api/assignments/${assignment._id}/analyses`).set(auth(other.token))).status).toBe(403);
  });
});

describe('CSV report', () => {
  test('downloads a CSV with one row per pair and the stored values', async () => {
    const id = (await analyze({ threshold: 0.6 })).body.analysis._id;
    const res = await request(app).get(`/api/analyses/${id}/report.csv`).set(auth(prof.token));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="analysis-/);
    const lines = res.text.trim().split('\r\n');
    expect(lines).toHaveLength(7);
    expect(lines[0]).toContain('Similarity %');
    expect(lines[1]).toContain('REVIEW_REQUIRED');
    expect(lines[1]).toContain('100.00');
    expect(res.text).toContain('Ana Original');
  });
  test('neutralises spreadsheet formula injection in names', async () => {
    const evil = await register('STUDENT', { name: '=HYPERLINK("http://x","click")' });
    const other = await register('STUDENT');
    const a = await createAssignment(prof.token, { title: 'CSV test' });
    await submit(evil.token, a._id, java('GradeBook_original.java'));
    await submit(other.token, a._id, java('GradeBook_renamed.java'));
    const id = (await analyze({}, prof.token, a._id)).body.analysis._id;
    const res = await request(app).get(`/api/analyses/${id}/report.csv`).set(auth(prof.token));
    expect(res.text).toContain(`"'=HYPERLINK(""http://x"",""click"")"`);
    expect(res.text).not.toMatch(/(^|,)"?=HYPERLINK/m);
  });
});
