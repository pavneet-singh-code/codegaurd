const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../../src/app');

let counter = 0;
const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function register(role, overrides = {}) {
  counter += 1;
  const body = { name: `${role} ${counter}`, email: `${role.toLowerCase()}${counter}@college.test`, password: 'password123', role, ...overrides };
  const res = await request(app).post('/api/auth/register').send(body);
  if (res.status !== 201) throw new Error(`register failed: ${JSON.stringify(res.body)}`);
  return { token: res.body.token, user: res.body.user, email: body.email };
}

async function createAssignment(token, overrides = {}) {
  const res = await request(app).post('/api/assignments').set(auth(token)).send({
    title: 'Gradebook', description: 'Compute simple statistics', programmingLanguage: 'java',
    deadline: new Date(Date.now() + 86400000).toISOString(), ...overrides,
  });
  if (res.status !== 201) throw new Error(`createAssignment failed: ${JSON.stringify(res.body)}`);
  return res.body.assignment;
}

const submit = (token, assignmentId, { filename, content }) =>
  request(app).post(`/api/assignments/${assignmentId}/submissions`).set(auth(token)).attach('file', Buffer.from(content), filename);

const fixture = (lang, name) => fs.readFileSync(path.join(__dirname, '../fixtures', lang, name), 'utf8');

module.exports = { app, request, auth, register, createAssignment, submit, fixture };
