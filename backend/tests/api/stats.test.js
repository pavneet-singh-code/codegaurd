const db = require('../helpers/db');
const { app, request, auth, register, createAssignment, submit, fixture } = require('../helpers/api');
const Assignment = require('../../src/models/Assignment');

beforeAll(db.connect);
afterAll(db.close);
beforeEach(db.clear);

const java = (name) => ({ filename: name, content: fixture('java', name) });

describe('professor stats', () => {
  let prof; let students; let assignment;
  beforeEach(async () => {
    prof = await register('PROFESSOR');
    students = [await register('STUDENT', { name: 'Ana' }), await register('STUDENT', { name: 'Ben' }), await register('STUDENT', { name: 'Cy' }), await register('STUDENT', { name: 'Di' })];
    assignment = await createAssignment(prof.token);
    await submit(students[0].token, assignment._id, java('Palindrome_different.java')); // Ana v1
    await submit(students[0].token, assignment._id, java('GradeBook_original.java'));   // Ana v2
    await submit(students[1].token, assignment._id, java('GradeBook_renamed.java'));
    await submit(students[2].token, assignment._id, java('GradeBook_independent.java'));
    await submit(students[3].token, assignment._id, java('Palindrome_different.java'));
    await request(app).post(`/api/assignments/${assignment._id}/analyze`).set(auth(prof.token)).send({ threshold: 0.6 });
  });
  const get = (token = prof.token) => request(app).get('/api/stats/professor').set(auth(token));

  test('totals are computed from real data (latest analysis, latest submissions)', async () => {
    const { totals, byAssignment, languageSplit } = (await get()).body;
    expect(totals).toMatchObject({ assignments: 1, open: 1, closed: 0, students: 4, submissions: 5, latestSubmissions: 4, lateSubmissions: 0, analysesRun: 1, pairsCompared: 6, flaggedPairs: 1 });
    expect(byAssignment[0]).toMatchObject({ submitted: 4, analysisCount: 1, flaggedPairs: 1, maxSimilarity: 1, programmingLanguage: 'java' });
    expect(languageSplit).toEqual({ java: 1, python: 0 });
  });
  test('rerunning an analysis does not double count flagged pairs', async () => {
    await request(app).post(`/api/assignments/${assignment._id}/analyze`).set(auth(prof.token)).send({ threshold: 0.6 });
    const { totals, byAssignment } = (await get()).body;
    expect(totals.analysesRun).toBe(2);
    expect(totals.flaggedPairs).toBe(1);
    expect(byAssignment[0].analysisCount).toBe(2);
  });
  test('timeline, histogram, top pairs and student table', async () => {
    const body = (await get()).body;
    expect(body.timeline).toHaveLength(14);
    expect(body.timeline.reduce((n, d) => n + d.count, 0)).toBe(5);
    expect(body.similarityBuckets).toHaveLength(10);
    expect(body.similarityBuckets.reduce((n, b) => n + b.count, 0)).toBe(6);
    expect(body.similarityBuckets[9].count).toBe(1);
    expect(body.topPairs[0]).toMatchObject({ similarityScore: 1, status: 'REVIEW_REQUIRED', assignmentTitle: 'Gradebook' });
    expect([body.topPairs[0].studentA, body.topPairs[0].studentB].sort()).toEqual(['Ana', 'Ben']);
    expect(body.students).toHaveLength(4);
    expect(body.students[0].highestSimilarity).toBe(1);
    const ana = body.students.find((s) => s.name === 'Ana');
    expect(ana).toMatchObject({ versions: 2, assignments: 1, flaggedPairs: 1 });
    expect(JSON.stringify(body)).not.toMatch(/password/i);
  });
  test("another professor sees none of this professor's data", async () => {
    const other = await register('PROFESSOR');
    const { totals, students } = (await get(other.token)).body;
    expect(totals).toMatchObject({ assignments: 0, students: 0, flaggedPairs: 0 });
    expect(students).toEqual([]);
  });
  test('only professors may read it', async () => {
    expect((await get(students[0].token)).status).toBe(403);
    expect((await request(app).get('/api/stats/professor')).status).toBe(401);
  });
});

describe('student stats', () => {
  test('progress numbers, states and no similarity data', async () => {
    const prof = await register('PROFESSOR'); const s1 = await register('STUDENT'); const s2 = await register('STUDENT');
    const done = await createAssignment(prof.token, { title: 'Done' });
    await createAssignment(prof.token, { title: 'Pending' });
    const past = await Assignment.create({ title: 'Missed', programmingLanguage: 'java', professor: prof.user._id, deadline: new Date(Date.now() - 3600000), allowLateSubmissions: false });
    const lateOk = await Assignment.create({ title: 'Late one', programmingLanguage: 'java', professor: prof.user._id, deadline: new Date(Date.now() - 3600000) });
    await submit(s1.token, done._id, java('GradeBook_original.java'));
    await submit(s1.token, done._id, java('GradeBook_modified.java'));
    await submit(s1.token, lateOk._id, java('GradeBook_renamed.java'));
    await submit(s2.token, done._id, java('GradeBook_independent.java'));

    const res = await request(app).get('/api/stats/student').set(auth(s1.token));
    expect(res.status).toBe(200);
    expect(res.body.totals).toMatchObject({ assignments: 4, submitted: 2, pending: 1, missed: 1, versions: 3, lateSubmissions: 1, onTimeRate: 0.5, avgVersions: 1.5 });
    const byTitle = Object.fromEntries(res.body.assignments.map((a) => [a.title, a]));
    expect(byTitle.Done).toMatchObject({ state: 'SUBMITTED', versions: 2 });
    expect(byTitle.Pending.state).toBe('PENDING');
    expect(byTitle.Missed.state).toBe('MISSED');
    expect(byTitle['Late one']).toMatchObject({ state: 'SUBMITTED', isLate: true });
    expect(res.body.upcoming.map((a) => a.title)).toEqual(['Pending']);
    expect(res.body.recent).toHaveLength(3);
    expect(res.body.timeline.reduce((n, d) => n + d.count, 0)).toBe(3);
    expect(JSON.stringify(res.body)).not.toMatch(/similar|jaccard|coverage/i);
    const other = await request(app).get('/api/stats/student').set(auth(s2.token));
    expect(other.body.totals.versions).toBe(1);
    expect((await request(app).get('/api/stats/student').set(auth(prof.token))).status).toBe(403);
  });
});

describe('account endpoints', () => {
  test('a user can rename themselves but not change role or email', async () => {
    const stu = await register('STUDENT');
    const res = await request(app).patch('/api/auth/me').set(auth(stu.token)).send({ name: 'New Name', role: 'PROFESSOR', email: 'x@y.com' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: 'New Name', role: 'STUDENT', email: stu.email });
    expect((await request(app).patch('/api/auth/me').set(auth(stu.token)).send({ name: 'x' })).status).toBe(422);
  });
  test('password change needs the current password and takes effect', async () => {
    const stu = await register('STUDENT');
    const bad = await request(app).post('/api/auth/change-password').set(auth(stu.token)).send({ currentPassword: 'nope-nope', newPassword: 'brand-new-pass' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('INVALID_CURRENT_PASSWORD');
    expect((await request(app).post('/api/auth/change-password').set(auth(stu.token)).send({ currentPassword: 'password123', newPassword: 'short' })).status).toBe(422);
    expect((await request(app).post('/api/auth/change-password').set(auth(stu.token)).send({ currentPassword: 'password123', newPassword: 'brand-new-pass' })).status).toBe(200);
    expect((await request(app).post('/api/auth/login').send({ email: stu.email, password: 'password123' })).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email: stu.email, password: 'brand-new-pass' })).status).toBe(200);
  });
});
