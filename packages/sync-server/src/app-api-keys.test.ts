import { createHash, randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getAccountDb } from './account-db';
import { handlers as accountApp } from './app-account';
import { handlers as app } from './app-api-keys';
import { handlers as syncApp } from './app-sync';

describe('API key lifecycle', () => {
  const db = getAccountDb();
  let userId: string;
  let otherUserId: string;
  let session: string;
  let otherSession: string;
  let fileId: string;

  beforeEach(() => {
    userId = randomUUID();
    otherUserId = randomUUID();
    session = randomUUID();
    otherSession = randomUUID();
    fileId = randomUUID();
    for (const [id, token] of [
      [userId, session],
      [otherUserId, otherSession],
    ]) {
      db.mutate(
        'INSERT INTO users (id, user_name, role, enabled) VALUES (?, ?, ?, 1)',
        [id, id, 'BASIC'],
      );
      db.mutate(
        'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, -1)',
        [token, id],
      );
    }
    db.mutate('INSERT INTO files (id, owner, name) VALUES (?, ?, ?)', [
      fileId,
      userId,
      'Test budget',
    ]);
  });

  afterEach(() => {
    for (const id of [userId, otherUserId]) {
      db.mutate('DELETE FROM api_keys WHERE user_id = ?', [id]);
      db.mutate('DELETE FROM user_access WHERE user_id = ?', [id]);
      db.mutate('DELETE FROM sessions WHERE user_id = ?', [id]);
      db.mutate('DELETE FROM users WHERE id = ?', [id]);
    }
    db.mutate('DELETE FROM files WHERE id = ?', [fileId]);
  });

  function createKey(
    token = session,
    body: Record<string, unknown> = { name: 'Import', fileId },
  ) {
    return request(app).post('/').set('X-ACTUAL-TOKEN', token).send(body);
  }

  it('returns the secret only at creation and stores its digest', async () => {
    const created = await createKey(session, { name: ' Import ', fileId });
    expect(created.status).toBe(201);
    expect(created.headers['cache-control']).toBe('no-store');
    const { key, ...metadata } = created.body.data;
    expect(key).toMatch(/^actual_[A-Za-z0-9_-]{43}$/);
    expect(metadata).toEqual({
      id: expect.any(String),
      name: 'Import',
      fileId,
      createdAt: expect.any(Number),
    });
    const row = db.first('SELECT * FROM api_keys WHERE id = ?', [metadata.id]);
    expect(row.key_hash).toBe(createHash('sha256').update(key).digest('hex'));
    expect(JSON.stringify(row)).not.toContain(key);

    const listed = await request(app).get('/').set('X-ACTUAL-TOKEN', session);
    expect(listed.status).toBe(200);
    expect(listed.headers['cache-control']).toBe('no-store');
    expect(listed.body.data).toEqual([metadata]);

    const second = await createKey();
    expect(second.body.data.key).not.toBe(key);
    expect(second.body.data.id).not.toBe(metadata.id);
  });

  it('isolates listing and revocation by creator, even for a shared budget', async () => {
    db.mutate('INSERT INTO user_access (user_id, file_id) VALUES (?, ?)', [
      otherUserId,
      fileId,
    ]);
    const first = await createKey();
    const second = await createKey(otherSession);
    expect(second.status).toBe(201);
    const listed = await request(app)
      .get('/')
      .set('X-ACTUAL-TOKEN', otherSession);
    expect(listed.body.data.map((key: { id: string }) => key.id)).toEqual([
      second.body.data.id,
    ]);
    const denied = await request(app)
      .delete(`/${first.body.data.id}`)
      .set('X-ACTUAL-TOKEN', otherSession);
    expect(denied.status).toBe(404);
    expect(
      db.first('SELECT id FROM api_keys WHERE id = ?', [first.body.data.id]),
    ).not.toBeNull();
  });

  it('lets the creator revoke a key after losing budget access', async () => {
    const created = await createKey();
    db.mutate('UPDATE files SET owner = ? WHERE id = ?', [otherUserId, fileId]);
    const revoked = await request(app)
      .delete(`/${created.body.data.id}`)
      .set('X-ACTUAL-TOKEN', session);
    expect(revoked.status).toBe(200);
    expect(
      db.first('SELECT id FROM api_keys WHERE id = ?', [created.body.data.id]),
    ).toBeNull();
    const repeated = await request(app)
      .delete(`/${created.body.data.id}`)
      .set('X-ACTUAL-TOKEN', session);
    expect(repeated.status).toBe(404);
  });

  it('rejects inaccessible, missing, and deleted budgets', async () => {
    expect((await createKey(otherSession)).status).toBe(403);
    expect(
      (await createKey(session, { name: 'Import', fileId: randomUUID() }))
        .status,
    ).toBe(403);
    db.mutate('UPDATE files SET deleted = 1 WHERE id = ?', [fileId]);
    expect((await createKey()).status).toBe(403);
    expect(
      db.all('SELECT id FROM api_keys WHERE user_id = ?', [userId]),
    ).toEqual([]);
  });

  it.each([
    { fileId: undefined },
    { name: undefined },
    { name: '' },
    { name: '   ' },
    { name: 'x'.repeat(101) },
    { name: 123 },
    { fileId: ['budget'] },
    { fileId: '../budget' },
  ])('rejects invalid creation input: %j', async invalid => {
    const response = await createKey(session, {
      name: 'Import',
      fileId,
      ...invalid,
    });
    expect(response.status).toBe(400);
    expect(
      db.all('SELECT id FROM api_keys WHERE user_id = ?', [userId]),
    ).toEqual([]);
  });

  it.each(['missing', 'expired', 'disabled', 'api-key'])(
    'requires an active user session for every lifecycle endpoint (%s)',
    async kind => {
      const created = await createKey();
      let token = session;
      if (kind === 'missing') token = '';
      if (kind === 'expired') {
        db.mutate('UPDATE sessions SET expires_at = 0 WHERE token = ?', [
          session,
        ]);
      }
      if (kind === 'disabled') {
        db.mutate('UPDATE users SET enabled = 0 WHERE id = ?', [userId]);
      }
      if (kind === 'api-key') token = created.body.data.key;

      expect((await createKey(token)).status).toBe(401);
      expect(
        (await request(app).get('/').set('X-ACTUAL-TOKEN', token)).status,
      ).toBe(401);
      expect(
        (
          await request(app)
            .delete(`/${created.body.data.id}`)
            .set('X-ACTUAL-TOKEN', token)
        ).status,
      ).toBe(401);
      expect(
        db.first('SELECT id FROM api_keys WHERE id = ?', [
          created.body.data.id,
        ]),
      ).not.toBeNull();
    },
  );

  it('rejects API keys on session-only account and sync routes', async () => {
    const created = await createKey();
    const token = created.body.data.key;
    expect(
      (
        await request(accountApp)
          .post('/server-prefs')
          .set('X-ACTUAL-TOKEN', token)
      ).status,
    ).toBe(401);
    expect(
      (
        await request(syncApp)
          .post('/upload-user-file')
          .set('X-ACTUAL-TOKEN', token)
      ).status,
    ).toBe(401);
  });
});
