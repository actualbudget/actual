import { randomUUID } from 'node:crypto';
import { existsSync, rmSync, writeFileSync } from 'node:fs';

import {
  create,
  fromBinary,
  MessageEnvelopeSchema,
  SyncRequestSchema,
  SyncResponseSchema,
  toBinary,
} from '@actual-app/crdt';
import type { MessageEnvelope } from '@actual-app/crdt';
import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getAccountDb } from './account-db';
import { handlers as accountApp } from './app-account';
import { handlers as adminApp } from './app-admin';
import { handlers as keysApp } from './app-api-keys';
import { handlers as syncApp } from './app-sync';
import {
  getPathForGroupFile,
  getPathForUserFile,
  isValidFileId,
  isValidGroupId,
} from './util/paths';

const app = express();
app.use(express.json());
app.use('/account', accountApp);
app.use('/admin', adminApp);
app.use('/api-keys', keysApp);
app.use('/sync', syncApp);

function budgetIds() {
  const fileId = randomUUID();
  const groupId = randomUUID();
  if (!isValidFileId(fileId) || !isValidGroupId(groupId)) {
    throw new Error('Invalid test IDs');
  }
  return { fileId, groupId };
}

describe('budget access with an API key', () => {
  const db = getAccountDb();
  let userId: string;
  let session: string;
  let key: string;
  let keyId: string;
  let budget: ReturnType<typeof budgetIds>;
  let otherBudget: ReturnType<typeof budgetIds>;

  beforeEach(async () => {
    userId = randomUUID();
    session = randomUUID();
    budget = budgetIds();
    otherBudget = budgetIds();
    db.mutate(
      'INSERT INTO users (id, user_name, role, enabled) VALUES (?, ?, ?, 1)',
      [userId, userId, 'ADMIN'],
    );
    db.mutate(
      'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, -1)',
      [session, userId],
    );
    for (const { fileId, groupId } of [budget, otherBudget]) {
      db.mutate(
        'INSERT INTO files (id, group_id, owner, sync_version, name) VALUES (?, ?, ?, 2, ?)',
        [fileId, groupId, userId, 'Test budget'],
      );
      writeFileSync(
        getPathForUserFile(fileId),
        `budget contents for ${fileId}`,
      );
    }
    const created = await request(app)
      .post('/api-keys')
      .set('X-ACTUAL-TOKEN', session)
      .send({ name: 'Import', fileIds: [budget.fileId] })
      .expect(201);
    key = created.body.data.key;
    keyId = created.body.data.id;
  });

  afterEach(() => {
    db.mutate('DELETE FROM api_keys WHERE user_id = ?', [userId]);
    db.mutate('DELETE FROM sessions WHERE user_id = ?', [userId]);
    db.mutate('DELETE FROM user_access WHERE user_id = ?', [userId]);
    db.mutate('DELETE FROM users WHERE id = ?', [userId]);
    for (const { fileId, groupId } of [budget, otherBudget]) {
      db.mutate('DELETE FROM files WHERE id = ?', [fileId]);
      rmSync(getPathForUserFile(fileId), { force: true });
      rmSync(getPathForGroupFile(groupId), { force: true });
    }
  });

  function get(path: string, fileId = budget.fileId, token = key) {
    return request(app)
      .get(path)
      .set('X-ACTUAL-TOKEN', token)
      .set('X-ACTUAL-FILE-ID', fileId);
  }

  function sync(
    fileId = budget.fileId,
    groupId = budget.groupId,
    messages: MessageEnvelope[] = [],
    encryptionKey = '',
  ) {
    return request(app)
      .post('/sync/sync')
      .set('X-ACTUAL-TOKEN', key)
      .set('Content-Type', 'application/actual-sync')
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .send(
        Buffer.from(
          toBinary(
            SyncRequestSchema,
            create(SyncRequestSchema, {
              fileId,
              groupId,
              keyId: encryptionKey,
              since: '1970-01-01T00:00:00.000Z',
              messages,
            }),
          ),
        ),
      );
  }

  it('validates the key without exposing the admin role of its creator, and lists only its budget', async () => {
    const validated = await get('/account/validate');
    expect(validated.status).toBe(200);
    expect(validated.body.data).toEqual({
      validated: true,
      loginMethod: 'api-key',
    });
    const listed = await get('/sync/list-user-files');
    expect(listed.status).toBe(200);
    expect(
      listed.body.data.map((file: { fileId: string }) => file.fileId),
    ).toEqual([budget.fileId]);
    const sessionList = await get(
      '/sync/list-user-files',
      budget.fileId,
      session,
    );
    expect(
      sessionList.body.data.map((file: { fileId: string }) => file.fileId),
    ).toEqual(expect.arrayContaining([budget.fileId, otherBudget.fileId]));
  });

  it.each([false, true])(
    'downloads and exchanges sync messages (encrypted: %s)',
    async encrypted => {
      const encryptionKey = encrypted ? 'encryption-key' : '';
      if (encrypted) {
        db.mutate(
          'UPDATE files SET encrypt_keyid = ?, encrypt_meta = ?, encrypt_salt = ?, encrypt_test = ? WHERE id = ?',
          [
            encryptionKey,
            JSON.stringify({ keyId: encryptionKey }),
            'salt',
            'test',
            budget.fileId,
          ],
        );
      }
      const info = await get('/sync/get-user-file-info');
      expect(info.status).toBe(200);
      expect(info.body.data.fileId).toBe(budget.fileId);
      expect(info.body.data.groupId).toBe(budget.groupId);
      const metadata = await request(app)
        .post('/sync/user-get-key')
        .send({ token: key, fileId: budget.fileId });
      expect(metadata.status).toBe(200);
      expect(metadata.body.data.id).toBe(encrypted ? encryptionKey : null);
      const downloaded = await get('/sync/download-user-file');
      expect(downloaded.status).toBe(200);
      expect(downloaded.body.toString()).toBe(
        `budget contents for ${budget.fileId}`,
      );

      const message = create(MessageEnvelopeSchema, {
        timestamp: '2026-10-01T00:00:00.000Z-0000-0000000000000001',
        isEncrypted: encrypted,
        content: new Uint8Array([1, 2, 3]),
      });
      expect(
        (await sync(budget.fileId, budget.groupId, [message], encryptionKey))
          .status,
      ).toBe(200);
      const received = await sync(
        budget.fileId,
        budget.groupId,
        [],
        encryptionKey,
      );
      expect(received.status).toBe(200);
      expect(
        fromBinary(SyncResponseSchema, new Uint8Array(received.body)).messages,
      ).toEqual([message]);
    },
  );

  it.each(['lost-access', 'deleted-budget'])(
    'supports multiple budgets and retains only accessible scopes after %s',
    async change => {
      const created = await request(app)
        .post('/api-keys')
        .set('X-ACTUAL-TOKEN', session)
        .send({
          name: 'Two budgets',
          fileIds: [budget.fileId, otherBudget.fileId],
        })
        .expect(201);
      key = created.body.data.key;
      const id = created.body.data.id;
      const scopes = [budget, otherBudget].map((target, index) => ({
        ...target,
        message: create(MessageEnvelopeSchema, {
          timestamp: '2026-10-01T00:00:00.000Z-0000-0000000000000001',
          content: new Uint8Array([index + 1]),
        }),
      }));
      for (const { fileId, groupId, message } of scopes) {
        const downloaded = await get('/sync/download-user-file', fileId);
        expect(downloaded.status).toBe(200);
        expect(downloaded.body.toString()).toBe(
          `budget contents for ${fileId}`,
        );
        expect((await sync(fileId, groupId, [message])).status).toBe(200);
      }
      for (const { fileId, groupId, message } of scopes) {
        const received = await sync(fileId, groupId);
        expect(received.status).toBe(200);
        expect(
          fromBinary(SyncResponseSchema, new Uint8Array(received.body))
            .messages,
        ).toEqual([message]);
      }
      expect(
        (await get('/sync/download-user-file', budgetIds().fileId)).status,
      ).toBe(403);
      expect((await sync(budgetIds().fileId, budget.groupId)).status).toBe(403);
      expect((await get('/sync/list-user-files')).body.data).toHaveLength(2);

      if (change === 'lost-access') {
        db.mutate('UPDATE users SET role = ? WHERE id = ?', ['BASIC', userId]);
        db.mutate('UPDATE files SET owner = ? WHERE id = ?', [
          'genericAdmin',
          otherBudget.fileId,
        ]);
      } else {
        db.mutate('UPDATE files SET deleted = 1 WHERE id = ?', [
          otherBudget.fileId,
        ]);
      }
      expect(
        (await get('/sync/download-user-file', otherBudget.fileId)).status,
      ).toBe(403);
      expect((await sync(otherBudget.fileId, otherBudget.groupId)).status).toBe(
        403,
      );
      expect((await get('/sync/download-user-file')).status).toBe(200);
      expect((await sync()).status).toBe(200);
      expect(
        (await get('/sync/list-user-files')).body.data.map(
          (file: { fileId: string }) => file.fileId,
        ),
      ).toEqual([budget.fileId]);

      await request(app)
        .delete(`/api-keys/${id}`)
        .set('X-ACTUAL-TOKEN', session)
        .expect(200);
      for (const { fileId, groupId } of scopes) {
        expect((await get('/sync/download-user-file', fileId)).status).toBe(
          401,
        );
        expect((await sync(fileId, groupId)).status).toBe(401);
      }
    },
  );

  it('rejects another budget through headers, JSON, and protobuf even for an admin key', async () => {
    for (const path of [
      '/sync/get-user-file-info',
      '/sync/download-user-file',
    ]) {
      expect((await get(path, otherBudget.fileId)).status).toBe(403);
    }
    expect(
      (
        await request(app)
          .post('/sync/user-get-key')
          .send({ token: key, fileId: otherBudget.fileId })
      ).status,
    ).toBe(403);
    expect((await sync(otherBudget.fileId, otherBudget.groupId)).status).toBe(
      403,
    );
    expect((await sync(budget.fileId, otherBudget.groupId)).status).toBe(400);
    expect(existsSync(getPathForGroupFile(otherBudget.groupId))).toBe(false);
  });

  it.each(['revoked', 'disabled-user', 'deleted-user'])(
    'rejects every permitted operation after %s',
    async change => {
      if (change === 'revoked') {
        await request(app)
          .delete(`/api-keys/${keyId}`)
          .set('X-ACTUAL-TOKEN', session)
          .expect(200);
      } else if (change === 'disabled-user') {
        db.mutate('UPDATE users SET enabled = 0 WHERE id = ?', [userId]);
      } else if (change === 'deleted-user') {
        db.mutate('DELETE FROM users WHERE id = ?', [userId]);
      }
      for (const path of [
        '/account/validate',
        '/sync/list-user-files',
        '/sync/get-user-file-info',
        '/sync/download-user-file',
      ]) {
        expect((await get(path)).status).toBe(401);
      }
      expect(
        (
          await request(app)
            .post('/sync/user-get-key')
            .send({ token: key, fileId: budget.fileId })
        ).status,
      ).toBe(401);
      expect((await sync()).status).toBe(401);
    },
  );

  it.each(['deleted-budget', 'lost-access', 'no-budget-grants'])(
    'authenticates the key but denies budget access after %s',
    async change => {
      if (change === 'deleted-budget') {
        db.mutate('UPDATE files SET deleted = 1 WHERE id = ?', [budget.fileId]);
      } else if (change === 'lost-access') {
        db.mutate('UPDATE users SET role = ? WHERE id = ?', ['BASIC', userId]);
        db.mutate('UPDATE files SET owner = ? WHERE id = ?', [
          'genericAdmin',
          budget.fileId,
        ]);
      } else {
        db.mutate('DELETE FROM api_key_budgets WHERE key_id = ?', [keyId]);
      }
      const validated = await get('/account/validate');
      expect(validated.status).toBe(200);
      expect(validated.body.data).toEqual({
        validated: true,
        loginMethod: 'api-key',
      });
      const listed = await get('/sync/list-user-files');
      expect(listed.status).toBe(200);
      expect(listed.body.data).toEqual([]);
      for (const path of [
        '/sync/get-user-file-info',
        '/sync/download-user-file',
      ]) {
        expect((await get(path)).status).toBe(403);
      }
      expect(
        (
          await request(app)
            .post('/sync/user-get-key')
            .send({ token: key, fileId: budget.fileId })
        ).status,
      ).toBe(403);
      expect((await sync()).status).toBe(403);
      expect((await get('/api-keys')).status).toBe(401);
      expect((await get('/admin/users')).status).toBe(401);
    },
  );

  it('retains shared access only while the creator has access', async () => {
    db.mutate('UPDATE users SET role = ? WHERE id = ?', ['BASIC', userId]);
    db.mutate('UPDATE files SET owner = ? WHERE id = ?', [
      'genericAdmin',
      budget.fileId,
    ]);
    db.mutate('INSERT INTO user_access (user_id, file_id) VALUES (?, ?)', [
      userId,
      budget.fileId,
    ]);
    expect((await get('/sync/download-user-file')).status).toBe(200);
    db.mutate('DELETE FROM user_access WHERE user_id = ?', [userId]);
    expect((await get('/sync/download-user-file')).status).toBe(403);
  });

  it.each([
    '/sync/user-create-key',
    '/sync/reset-user-file',
    '/sync/upload-user-file',
    '/sync/update-user-filename',
    '/sync/delete-user-file',
    '/account/server-prefs',
    '/admin/access',
    '/api-keys',
  ])('rejects API keys on POST %s', async path => {
    expect(
      (
        await request(app)
          .post(path)
          .set('X-ACTUAL-TOKEN', key)
          .send({ token: key, fileId: budget.fileId, name: 'Changed' })
      ).status,
    ).toBe(401);
  });

  it('rejects administration and key management', async () => {
    expect((await get('/admin/users')).status).toBe(401);
    expect((await get('/api-keys')).status).toBe(401);
    expect(
      (
        await request(app)
          .delete(`/api-keys/${keyId}`)
          .set('X-ACTUAL-TOKEN', key)
      ).status,
    ).toBe(401);
  });

  it.each(['actual_bad', `actual_${'a'.repeat(43)}`])(
    'rejects a malformed or unknown key',
    async token => {
      expect(
        (await get('/account/validate', budget.fileId, token)).status,
      ).toBe(401);
      expect(
        (await get('/sync/download-user-file', budget.fileId, token)).status,
      ).toBe(401);
    },
  );
});
