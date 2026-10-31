const db = require('../helpers/db');
const { app, request, auth, register, createAssignment } = require('../helpers/api');

beforeAll(db.connect);
afterAll(db.close);
beforeEach(db.clear);

const future = () => new Date(Date.now() + 86400000).toISOString();

describe('creating assignments', () => {
  test('professors can create; the owner is set from the token, not the body', async () => {
    const prof = await register('PROFESSOR'); const other = await register('PROFESSOR');
    const res = await request(app).post('/api/assignments').set(auth(prof.token))
      .send({ title: 'Sorting', programmingLanguage: 'python', deadline: future(), professor: other.user._id, status: 'CLOSED' });
    expect(res.status).toBe(201);
    expect(res.body.assignment.professor).toBe(prof.user._id);
    expect(res.body.assignment.status).toBe('OPEN');
  });
  test('students cannot create (403) and anonymous users get 401', async () => {
    const stu = await register('STUDENT');
    const body = { title: 'Sorting', programmingLanguage: 'python', deadline: future() };
    expect((await request(app).post('/api/assignments').set(auth(stu.token)).send(body)).status).toBe(403);
    expect((await request(app).post('/api/assignments').send(body)).status).toBe(401);
  });
  test('validates input', async () => {
    const prof = await register('PROFESSOR');
    for (const bad of [{ title: 'x' }, { programmingLanguage: 'cobol' }, { deadline: 'tomorrow-ish' }]) {
      const res = await request(app).post('/api/assignments').set(auth(prof.token))
        .send({ title: 'Valid title', programmingLanguage: 'java', deadline: future(), ...bad });
      expect(res.status).toBe(422);
    }
  });
});

describe('ownership', () => {
  let p1; let p2; let student; let a1;
  beforeEach(async () => {
    p1 = await register('PROFESSOR'); p2 = await register('PROFESSOR'); student = await register('STUDENT');
    a1 = await createAssignment(p1.token);
  });

  test('professors list only their own assignments; students see all with submission counts', async () => {
    await createAssignment(p2.token, { title: 'Other prof assignment' });
    const mine = await request(app).get('/api/assignments').set(auth(p1.token));
    expect(mine.body.assignments).toHaveLength(1);
    expect(mine.body.assignments[0]).toMatchObject({ _id: a1._id, submissionCount: 0 });
    const seen = await request(app).get('/api/assignments').set(auth(student.token));
    expect(seen.body.assignments).toHaveLength(2);
  });
  test('another professor cannot view, update or close an assignment (403)', async () => {
    expect((await request(app).get(`/api/assignments/${a1._id}`).set(auth(p2.token))).status).toBe(403);
    expect((await request(app).put(`/api/assignments/${a1._id}`).set(auth(p2.token)).send({ title: 'Hijacked' })).status).toBe(403);
    expect((await request(app).patch(`/api/assignments/${a1._id}/close`).set(auth(p2.token))).status).toBe(403);
    expect((await request(app).get(`/api/assignments/${a1._id}/submissions`).set(auth(p2.token))).status).toBe(403);
  });
  test('students can view details but cannot modify (403)', async () => {
    expect((await request(app).get(`/api/assignments/${a1._id}`).set(auth(student.token))).status).toBe(200);
    expect((await request(app).put(`/api/assignments/${a1._id}`).set(auth(student.token)).send({ title: 'Nope nope' })).status).toBe(403);
    expect((await request(app).patch(`/api/assignments/${a1._id}/close`).set(auth(student.token))).status).toBe(403);
  });
  test('the owner can update (whitelisted fields only) and close', async () => {
    const up = await request(app).put(`/api/assignments/${a1._id}`).set(auth(p1.token)).send({ title: 'Renamed', professor: p2.user._id });
    expect(up.status).toBe(200);
    expect(up.body.assignment.title).toBe('Renamed');
    expect(up.body.assignment.professor).toBe(p1.user._id);
    const closed = await request(app).patch(`/api/assignments/${a1._id}/close`).set(auth(p1.token));
    expect(closed.body.assignment.status).toBe('CLOSED');
  });
  test('bad ids give 422 and unknown ids give 404', async () => {
    expect((await request(app).get('/api/assignments/123').set(auth(p1.token))).status).toBe(422);
    expect((await request(app).get('/api/assignments/64b7f0f0f0f0f0f0f0f0f0f0').set(auth(p1.token))).status).toBe(404);
  });
  test('lists are paginated', async () => {
    for (let i = 0; i < 3; i++) await createAssignment(p1.token, { title: `Extra ${i}` });
    const res = await request(app).get('/api/assignments?limit=2&page=2').set(auth(p1.token));
    expect(res.body.assignments).toHaveLength(2);
    expect(res.body.pagination).toEqual({ page: 2, limit: 2, total: 4, totalPages: 2 });
  });
});
