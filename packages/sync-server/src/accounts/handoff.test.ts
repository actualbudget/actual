import { createHash, randomBytes } from 'node:crypto';

import request from 'supertest';

import { getAccountDb } from '#account-db';
import { handlers } from '#app-openid';

import { createHandoff } from './handoff';

const verifier = randomBytes(32).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');

beforeEach(() => {
  getAccountDb().mutate("DELETE FROM sessions WHERE auth_method = 'openid'");
  getAccountDb().mutate(
    "INSERT INTO auth (method, active) VALUES ('openid', 1)",
  );
});

afterEach(() => {
  getAccountDb().mutate("DELETE FROM auth WHERE method = 'openid'");
  getAccountDb().mutate('DELETE FROM openid_handoffs');
  getAccountDb().mutate("DELETE FROM sessions WHERE auth_method = 'openid'");
});

it('creates a session only on successful exchange, and rejects replay', async () => {
  const code = createHandoff('genericAdmin', challenge, -1);
  expect(
    getAccountDb().all("SELECT * FROM sessions WHERE auth_method = 'openid'"),
  ).toHaveLength(0);
  const response = await request(handlers)
    .post('/exchange')
    .send({ code, verifier });
  expect(response.status).toBe(200);
  expect(response.headers['cache-control']).toBe('no-store');
  expect(
    getAccountDb().first('SELECT user_id FROM sessions WHERE token = ?', [
      response.body.data.token,
    ]),
  ).toEqual({ user_id: 'genericAdmin' });
  expect(
    (await request(handlers).post('/exchange').send({ code, verifier })).status,
  ).toBe(400);
});

it('rejects a callback from another browser without consuming it', async () => {
  const code = createHandoff('genericAdmin', challenge, -1);
  expect(
    (
      await request(handlers)
        .post('/exchange')
        .send({ code, verifier: 'x'.repeat(43) })
    ).status,
  ).toBe(400);
  expect(
    (await request(handlers).post('/exchange').send({ code, verifier })).status,
  ).toBe(200);
});

it('expires codes after 60 seconds', async () => {
  const code = createHandoff('genericAdmin', challenge, -1);
  getAccountDb().mutate(
    'UPDATE openid_handoffs SET expires_at = ? WHERE code = ?',
    [Date.now() - 1, code],
  );
  expect(
    (await request(handlers).post('/exchange').send({ code, verifier })).status,
  ).toBe(400);
});

it('creates only one session for concurrent exchange requests', async () => {
  const code = createHandoff('genericAdmin', challenge, -1);
  const responses = await Promise.all(
    [1, 2].map(() =>
      request(handlers).post('/exchange').send({ code, verifier }),
    ),
  );
  expect(
    responses.map(response => response.status).sort((a, b) => a - b),
  ).toEqual([200, 400]);
});

it('rolls back consumption when session creation fails', async () => {
  const db = getAccountDb();
  const code = createHandoff('genericAdmin', challenge, -1);
  db.exec(
    "CREATE TEMP TRIGGER fail_handoff BEFORE INSERT ON sessions BEGIN SELECT RAISE(ABORT, 'test'); END",
  );
  try {
    expect(
      (await request(handlers).post('/exchange').send({ code, verifier }))
        .status,
    ).toBe(500);
    expect(
      db.first('SELECT code FROM openid_handoffs WHERE code = ?', [code]),
    ).toEqual({ code });
  } finally {
    db.exec('DROP TRIGGER fail_handoff');
  }
  expect(
    (await request(handlers).post('/exchange').send({ code, verifier })).status,
  ).toBe(200);
});
