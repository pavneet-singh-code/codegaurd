const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const db = require('../helpers/db');
const { app, request, auth, register } = require('../helpers/api');
const User = require('../../src/models/User');

beforeAll(db.connect);
afterAll(db.close);
beforeEach(db.clear);

const valid = { name: 'Asha Rao', email: 'asha@college.test', password: 'password123', role: 'STUDENT' };

describe('registration', () => {
  test('creates an account, returns a token and never returns the password', async () => {
    const res = await request(app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ name: 'Asha Rao', email: 'asha@college.test', role: 'STUDENT' });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });
  test('stores a bcrypt hash, not the plaintext password', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const stored = await User.findOne({ email: valid.email }).select('+password');
    expect(stored.password).not.toBe(valid.password);
    expect(stored.password).toMatch(/^\$2[aby]\$/);
  });
  test('rejects duplicate emails, ignoring case and whitespace', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const res = await request(app).post('/api/auth/register').send({ ...valid, email: '  ASHA@College.test ' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
    expect(await User.countDocuments()).toBe(1);
  });
  test('a unique index on email exists in MongoDB', async () => {
    const indexes = await User.collection.indexes();
    expect(indexes.some((i) => i.key.email === 1 && i.unique)).toBe(true);
  });
  test.each([
    ['short password', { password: 'short' }, 'password'],
    ['bad email', { email: 'not-an-email' }, 'email'],
    ['bad role', { role: 'ADMIN' }, 'role'],
    ['missing name', { name: '' }, 'name'],
  ])('validation: %s', async (_label, patch, field) => {
    const res = await request(app).post('/api/auth/register').send({ ...valid, ...patch });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === field)).toBe(true);
  });
  test('ignores unexpected fields (mass assignment)', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...valid, _id: new mongoose.Types.ObjectId(), isAdmin: true, createdAt: '2000-01-01' });
    expect(res.status).toBe(201);
    expect(res.body.user.isAdmin).toBeUndefined();
    expect(new Date(res.body.user.createdAt).getFullYear()).toBeGreaterThan(2000);
  });
  test('professor registration can require an invite code', async () => {
    process.env.PROFESSOR_INVITE_CODE = 'letmein';
    try {
      const body = { ...valid, email: 'prof@college.test', role: 'PROFESSOR' };
      expect((await request(app).post('/api/auth/register').send(body)).status).toBe(403);
      expect((await request(app).post('/api/auth/register').send({ ...body, inviteCode: 'letmein' })).status).toBe(201);
      expect((await request(app).post('/api/auth/register').send({ ...valid, email: 'stu@college.test' })).status).toBe(201); // students unaffected
    } finally { delete process.env.PROFESSOR_INVITE_CODE; }
  });
});

describe('login', () => {
  beforeEach(() => request(app).post('/api/auth/register').send(valid));

  test('returns a JWT that expires', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ASHA@college.test', password: valid.password });
    expect(res.status).toBe(200);
    const payload = jwt.decode(res.body.token);
    expect(payload.role).toBe('STUDENT');
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });
  test('wrong password and unknown email give the same error', async () => {
    const wrong = await request(app).post('/api/auth/login').send({ email: valid.email, password: 'wrong-password' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'nobody@college.test', password: 'password123' });
    expect(wrong.status).toBe(401); expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
  });
  test('NoSQL-injection style payloads are rejected', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: { $gt: '' }, password: { $gt: '' } });
    expect(res.status).toBe(422);
  });
});

describe('GET /api/auth/me', () => {
  test('returns the current user without the password hash', async () => {
    const { token } = await register('PROFESSOR');
    const res = await request(app).get('/api/auth/me').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('PROFESSOR');
    expect(res.body.user.password).toBeUndefined();
  });
  test('rejects missing, malformed, tampered and expired tokens with a consistent 401', async () => {
    const { user } = await register('STUDENT');
    const expired = jwt.sign({ sub: user._id, role: 'STUDENT' }, process.env.JWT_SECRET, { expiresIn: -10 });
    const wrongSecret = jwt.sign({ sub: user._id, role: 'STUDENT' }, 'another-secret-another-secret');
    for (const headers of [{}, { Authorization: 'Bearer nonsense' }, auth(expired), auth(wrongSecret), { Authorization: 'Basic abc' }]) {
      const res = await request(app).get('/api/auth/me').set(headers);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    }
  });
  test('a token for a deleted user stops working', async () => {
    const { token, user } = await register('STUDENT');
    await User.deleteOne({ _id: user._id });
    expect((await request(app).get('/api/auth/me').set(auth(token))).status).toBe(401);
  });
});

describe('error handling', () => {
  test('unknown routes return JSON 404 and bad JSON returns 400 without stack traces', async () => {
    const nf = await request(app).get('/api/nothing-here');
    expect(nf.status).toBe(404);
    const bad = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{oops');
    expect(bad.status).toBe(400);
    expect(JSON.stringify(bad.body)).not.toMatch(/at .*\.js/);
  });
});
