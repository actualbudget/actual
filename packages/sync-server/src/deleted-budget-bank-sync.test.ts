import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getAccountDb } from './account-db';
import { handlers as pluggy } from './app-pluggyai/app-pluggyai';
import { pluggyaiService } from './app-pluggyai/pluggyai-service';
import { handlers as sync } from './app-sync';
import { SecretName, secretsService } from './services/secrets-service';

const fileId = 'deleted-bank-sync-budget';
const otherFileId = 'other-bank-sync-budget';
let globalToken: string | null;

beforeEach(() => {
  globalToken = secretsService.get(SecretName.simplefin_token);
  secretsService.set(SecretName.simplefin_token, 'global-secret');
  getAccountDb().mutate(
    'INSERT INTO files (id, deleted, owner) VALUES (?, 0, ?)',
    [fileId, 'genericUser'],
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  if (globalToken === null) {
    secretsService.reset(SecretName.simplefin_token);
  } else {
    secretsService.set(SecretName.simplefin_token, globalToken);
  }
  getAccountDb().mutate('DELETE FROM user_access WHERE file_id = ?', [fileId]);
  getAccountDb().mutate('DELETE FROM files WHERE id = ?', [fileId]);
  for (const name of Object.values(SecretName)) {
    secretsService.reset(name, fileId);
    secretsService.reset(name, otherFileId);
  }
});

describe('deleted budget bank sync', () => {
  it.each(['valid-token-admin', 'valid-token-user'])(
    'rejects deleted and missing budgets for %s before selecting credentials',
    async token => {
      const source = vi.spyOn(pluggyaiService, 'getCredentialSource');
      await request(pluggy)
        .post('/status')
        .set('x-actual-token', token)
        .set('X-Actual-File-Id', fileId)
        .expect(200);
      getAccountDb().mutate('UPDATE files SET deleted = 1 WHERE id = ?', [
        fileId,
      ]);
      source.mockClear();
      for (const id of [fileId, 'missing-bank-sync-budget']) {
        for (const path of ['/status', '/accounts', '/transactions']) {
          await request(pluggy)
            .post(path)
            .set('x-actual-token', token)
            .set('X-Actual-File-Id', id)
            .expect(403);
        }
      }
      expect(source).not.toHaveBeenCalled();
    },
  );

  it('rejects deleted budgets even when a sharing record remains', async () => {
    getAccountDb().mutate('UPDATE files SET owner = ? WHERE id = ?', [
      'genericAdmin',
      fileId,
    ]);
    getAccountDb().mutate(
      'INSERT INTO user_access (file_id, user_id) VALUES (?, ?)',
      [fileId, 'genericUser'],
    );
    await request(pluggy)
      .post('/status')
      .set('x-actual-token', 'valid-token-user')
      .set('X-Actual-File-Id', fileId)
      .expect(200);
    getAccountDb().mutate('UPDATE files SET deleted = 1 WHERE id = ?', [
      fileId,
    ]);
    const denied = await request(pluggy)
      .post('/status')
      .set('x-actual-token', 'valid-token-user')
      .set('X-Actual-File-Id', fileId);
    expect(denied.status).toBe(403);
  });

  it('rolls back deletion and earlier secret resets when cleanup fails, allowing a retry', async () => {
    const db = getAccountDb();
    const names = [SecretName.simplefin_token, SecretName.simplefin_accessKey];
    for (const name of names) {
      secretsService.set(name, 'budget-secret', fileId);
    }
    db.exec(`CREATE TEMP TRIGGER fail_secret_cleanup BEFORE DELETE ON secrets
      WHEN OLD.name = 'simplefin_accessKey:deleted-bank-sync-budget'
      BEGIN SELECT RAISE(ABORT, 'simulated cleanup failure'); END`);
    try {
      await request(sync)
        .post('/delete-user-file')
        .set('x-actual-token', 'valid-token-user')
        .send({ fileId })
        .expect(500);
      expect(
        db.first('SELECT deleted FROM files WHERE id = ?', [fileId]),
      ).toEqual({ deleted: 0 });
      for (const name of names) {
        expect(secretsService.get(name, fileId)).toBe('budget-secret');
      }
    } finally {
      db.exec('DROP TRIGGER fail_secret_cleanup');
    }
    await request(sync)
      .post('/delete-user-file')
      .set('x-actual-token', 'valid-token-user')
      .send({ fileId })
      .expect(200);
    expect(
      db.first('SELECT deleted FROM files WHERE id = ?', [fileId]),
    ).toEqual({ deleted: 1 });
    for (const name of names) {
      expect(secretsService.get(name, fileId)).toBeNull();
    }
  });

  it('clears only the deleted budget secrets through the deletion endpoint', async () => {
    const globals = Object.values(SecretName).map(name =>
      secretsService.get(name),
    );
    for (const name of Object.values(SecretName)) {
      secretsService.set(name, 'deleted-budget-secret', fileId);
      secretsService.set(name, 'other-budget-secret', otherFileId);
    }
    await request(sync)
      .post('/delete-user-file')
      .set('x-actual-token', 'valid-token-user')
      .send({ fileId })
      .expect(200);
    for (const name of Object.values(SecretName)) {
      expect(secretsService.get(name, fileId)).toBeNull();
      expect(secretsService.get(name, otherFileId)).toBe('other-budget-secret');
    }
    expect(
      Object.values(SecretName).map(name => secretsService.get(name)),
    ).toEqual(globals);
    const denied = await request(pluggy)
      .post('/status')
      .set('x-actual-token', 'valid-token-user')
      .set('X-Actual-File-Id', fileId);
    expect(denied.status).toBe(403);
    await request(pluggy)
      .post('/status')
      .set('x-actual-token', 'valid-token-admin')
      .expect(200);
  });
});
