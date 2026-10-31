const fs = require('fs');
const path = require('path');
const db = require('../helpers/db');
const { app, request, auth, register, createAssignment, submit, fixture } = require('../helpers/api');
const Assignment = require('../../src/models/Assignment');
const Submission = require('../../src/models/Submission');

beforeAll(db.connect);
afterAll(db.close);
beforeEach(db.clear);

const java = (name) => ({ filename: name, content: fixture('java', name) });
let prof; let s1; let s2; let assignment;
beforeEach(async () => {
  prof = await register('PROFESSOR'); s1 = await register('STUDENT'); s2 = await register('STUDENT');
  assignment = await createAssignment(prof.token);
});

describe('uploading', () => {
  test('stores metadata, writes the file under a server-generated name and hides internal paths', async () => {
    const res = await submit(s1.token, assignment._id, java('GradeBook_original.java'));
    expect(res.status).toBe(201);
    expect(res.body.submission).toMatchObject({ version: 1, originalFilename: 'GradeBook_original.java', isLate: false, status: 'SUBMITTED', programmingLanguage: 'java' });
    expect(res.body.submission.filePath).toBeUndefined();
    expect(res.body.submission.storedFilename).toBeUndefined();
    const row = await Submission.findById(res.body.submission._id);
    expect(row.storedFilename).not.toContain('GradeBook');
    expect(fs.existsSync(path.join(process.env.UPLOAD_DIR, row.filePath))).toBe(true);
  });
  test('path traversal in the file name is neutralised', async () => {
    const res = await submit(s1.token, assignment._id, { filename: '../../evil.java', content: fixture('java', 'GradeBook_original.java') });
    expect(res.status).toBe(201);
    expect(res.body.submission.originalFilename).toBe('evil.java');
    const row = await Submission.findById(res.body.submission._id);
    const full = path.resolve(process.env.UPLOAD_DIR, row.filePath);
    expect(full.startsWith(path.resolve(process.env.UPLOAD_DIR) + path.sep)).toBe(true);
    expect(fs.existsSync(path.join(process.env.UPLOAD_DIR, '..', 'evil.java'))).toBe(false);
  });
  test('only students can upload', async () => {
    expect((await submit(prof.token, assignment._id, java('GradeBook_original.java'))).status).toBe(403);
    expect((await request(app).post(`/api/assignments/${assignment._id}/submissions`)).status).toBe(401);
  });
});

describe('file validation', () => {
  test('rejects unsupported extensions (415), wrong language (415) and a missing file (400)', async () => {
    expect((await submit(s1.token, assignment._id, { filename: 'notes.txt', content: 'hello' })).status).toBe(415);
    expect((await submit(s1.token, assignment._id, { filename: 'a.py', content: 'print(1)' })).status).toBe(415);
    const none = await request(app).post(`/api/assignments/${assignment._id}/submissions`).set(auth(s1.token));
    expect(none.status).toBe(400);
    expect(none.body.error.code).toBe('FILE_REQUIRED');
  });
  test('rejects oversized files (413)', async () => {
    const res = await submit(s1.token, assignment._id, { filename: 'Big.java', content: '// x\n'.repeat(8000) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });
  test('rejects binary content and empty files even with a .java name', async () => {
    const bin = await request(app).post(`/api/assignments/${assignment._id}/submissions`).set(auth(s1.token)).attach('file', Buffer.from([0x50, 0x4b, 0x00, 0x03, 0xff, 0xfe]), 'Fake.java');
    expect(bin.status).toBe(400);
    expect((await submit(s1.token, assignment._id, { filename: 'Empty.java', content: '   \n' })).status).toBe(400);
  });
});

describe('versioning', () => {
  test('a changed file becomes version 2 and the old one is superseded; history lists both', async () => {
    const v1 = await submit(s1.token, assignment._id, java('GradeBook_original.java'));
    const v2 = await submit(s1.token, assignment._id, java('GradeBook_modified.java'));
    expect(v2.body.submission.version).toBe(2);
    expect((await Submission.findById(v1.body.submission._id)).status).toBe('SUPERSEDED');
    const hist = await request(app).get(`/api/submissions/${v2.body.submission._id}/versions`).set(auth(s1.token));
    expect(hist.body.versions.map((v) => v.version)).toEqual([2, 1]);
  });
  test('re-uploading identical content is rejected as a duplicate (409)', async () => {
    await submit(s1.token, assignment._id, java('GradeBook_original.java'));
    const dup = await submit(s1.token, assignment._id, { filename: 'Renamed.java', content: fixture('java', 'GradeBook_original.java') });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('DUPLICATE_SUBMISSION');
    expect(await Submission.countDocuments()).toBe(1);
  });
  test('version numbers are unique per student and assignment (database index)', async () => {
    const v1 = await submit(s1.token, assignment._id, java('GradeBook_original.java'));
    const row = (await Submission.findById(v1.body.submission._id)).toObject(); delete row._id;
    await expect(Submission.create(row)).rejects.toMatchObject({ code: 11000 });
  });
  test('different students each get their own version 1', async () => {
    const a = await submit(s1.token, assignment._id, java('GradeBook_original.java'));
    const b = await submit(s2.token, assignment._id, java('GradeBook_renamed.java'));
    expect([a.body.submission.version, b.body.submission.version]).toEqual([1, 1]);
  });
});

describe('deadlines', () => {
  const makePast = (extra = {}) => Assignment.create({ title: 'Past', programmingLanguage: 'java', professor: prof.user._id, deadline: new Date(Date.now() - 3600000), ...extra });

  test('late submissions are accepted and flagged using the server clock when allowed', async () => {
    const a = await makePast();
    const res = await submit(s1.token, a._id, java('GradeBook_original.java'));
    expect(res.status).toBe(201);
    expect(res.body.submission.isLate).toBe(true);
  });
  test('late submissions are refused when the professor disallows them', async () => {
    const a = await makePast({ allowLateSubmissions: false });
    const res = await submit(s1.token, a._id, java('GradeBook_original.java'));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('DEADLINE_PASSED');
  });
  test('closed assignments refuse submissions (409)', async () => {
    await request(app).patch(`/api/assignments/${assignment._id}/close`).set(auth(prof.token));
    const res = await submit(s1.token, assignment._id, java('GradeBook_original.java'));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ASSIGNMENT_CLOSED');
  });
  test('the client cannot claim a different submission time', async () => {
    const a = await makePast({ allowLateSubmissions: true });
    const res = await request(app).post(`/api/assignments/${a._id}/submissions`).set(auth(s1.token))
      .field('isLate', 'false').field('submittedAt', new Date(Date.now() - 86400000).toISOString())
      .attach('file', Buffer.from(fixture('java', 'GradeBook_original.java')), 'A.java');
    expect(res.body.submission.isLate).toBe(true);
  });
});

describe('access control', () => {
  let sub;
  beforeEach(async () => { sub = (await submit(s1.token, assignment._id, java('GradeBook_original.java'))).body.submission; });

  test('the owner and the owning professor can read a submission including its source', async () => {
    const own = await request(app).get(`/api/submissions/${sub._id}`).set(auth(s1.token));
    expect(own.status).toBe(200);
    expect(own.body.submission.content).toContain('class GradeBook');
    expect(own.body.submission.filePath).toBeUndefined();
    expect((await request(app).get(`/api/submissions/${sub._id}`).set(auth(prof.token))).status).toBe(200);
  });
  test("another student cannot read someone else's submission or its versions (403)", async () => {
    expect((await request(app).get(`/api/submissions/${sub._id}`).set(auth(s2.token))).status).toBe(403);
    expect((await request(app).get(`/api/submissions/${sub._id}/versions`).set(auth(s2.token))).status).toBe(403);
  });
  test('a different professor cannot read it (403)', async () => {
    const other = await register('PROFESSOR');
    expect((await request(app).get(`/api/submissions/${sub._id}`).set(auth(other.token))).status).toBe(403);
  });
  test('students list only their own history; professors see the latest version per student', async () => {
    await submit(s1.token, assignment._id, java('GradeBook_modified.java'));
    await submit(s2.token, assignment._id, java('GradeBook_renamed.java'));
    const mine = await request(app).get(`/api/assignments/${assignment._id}/submissions`).set(auth(s2.token));
    expect(mine.body.submissions).toHaveLength(1);
    const profView = await request(app).get(`/api/assignments/${assignment._id}/submissions`).set(auth(prof.token));
    expect(profView.body.submissions).toHaveLength(2);
    expect(profView.body.submissions[0].student.password).toBeUndefined();
    const all = await request(app).get(`/api/assignments/${assignment._id}/submissions?allVersions=true`).set(auth(prof.token));
    expect(all.body.submissions).toHaveLength(3);
    const page = await request(app).get(`/api/assignments/${assignment._id}/submissions?allVersions=true&limit=2`).set(auth(prof.token));
    expect(page.body.submissions).toHaveLength(2);
    expect(page.body.pagination.total).toBe(3);
  });
  test('GET /api/submissions/mine returns the student history across assignments', async () => {
    const second = await createAssignment(prof.token, { title: 'Second' });
    await submit(s1.token, second._id, java('GradeBook_renamed.java'));
    const res = await request(app).get('/api/submissions/mine').set(auth(s1.token));
    expect(res.body.submissions).toHaveLength(2);
    expect(res.body.submissions[0].assignment.title).toBeDefined();
    expect((await request(app).get('/api/submissions/mine').set(auth(prof.token))).status).toBe(403);
  });
  test('the language of an assignment is locked once submissions exist', async () => {
    const res = await request(app).put(`/api/assignments/${assignment._id}`).set(auth(prof.token)).send({ programmingLanguage: 'python' });
    expect(res.status).toBe(409);
  });
});
