import request from 'supertest';

import { getAccountDb } from './account-db';
import { handlers as app } from './app-secrets';
import { SecretName, secretsService } from './services/secrets-service';

const enableOpenIdAuth = () => {
  const db = getAccountDb();
  db.mutate('DELETE FROM auth');
  db.mutate(
    "INSERT INTO auth (method, active, extra_data, display_name) VALUES ('openid', 1, '', 'OpenID')",
  );
};

describe('secretsService', () => {
  const testSecretName = SecretName.simplefin_token;
  const testSecretValue = 'testValue';
  const testFileId = 'test-file-id';

  it('should set a secret', () => {
    const result = secretsService.set(
      testSecretName,
      testSecretValue,
      testFileId,
    );
    expect(result).toBeDefined();
    expect(result.changes).toBe(1);
    expect(
      getAccountDb().first('SELECT value FROM secrets WHERE name = ?', [
        `${testSecretName}:${testFileId}`,
      ])?.value,
    ).toBe(testSecretValue);
  });

  it('should get a secret', () => {
    const result = secretsService.get(testSecretName, testFileId);
    expect(result).toBeDefined();
    expect(result).toBe(testSecretValue);
  });

  it('should check if a secret exists', () => {
    const exists = secretsService.exists(testSecretName, testFileId);
    expect(exists).toBe(true);

    const nonExistent = secretsService.exists('nonExistentSecret', testFileId);
    expect(nonExistent).toBe(false);
  });

  it('should update a secret', () => {
    const newValue = 'newValue';
    const setResult = secretsService.set(testSecretName, newValue, testFileId);
    expect(setResult).toBeDefined();
    expect(setResult.changes).toBe(1);

    const getResult = secretsService.get(testSecretName, testFileId);
    expect(getResult).toBeDefined();
    expect(getResult).toBe(newValue);
  });

  it('should keep global secrets compatible when fileId is missing', () => {
    secretsService.set(testSecretName, 'global-value');

    expect(secretsService.get(testSecretName)).toBe('global-value');
    expect(secretsService.exists(testSecretName)).toBe(true);
    expect(
      getAccountDb().first('SELECT value FROM secrets WHERE name = ?', [
        testSecretName,
      ])?.value,
    ).toBe('global-value');
  });

  it('should treat empty string secrets as existing', () => {
    secretsService.set(testSecretName, '', testFileId);

    expect(secretsService.get(testSecretName, testFileId)).toBe('');
    expect(secretsService.exists(testSecretName, testFileId)).toBe(true);
  });

  describe('two-tier credentials', () => {
    const fileAId = 'test-file-a';
    const fileBId = 'test-file-b';

    beforeEach(() => {
      getAccountDb().mutate('DELETE FROM secrets WHERE name = ?', [
        testSecretName,
      ]);
      secretsService.reset(testSecretName);
      secretsService.reset(testSecretName, fileAId);
      secretsService.reset(testSecretName, fileBId);
    });

    it('does not return global credentials when a budget file credential is missing', () => {
      secretsService.set(testSecretName, 'global-value');

      expect(secretsService.get(testSecretName, fileAId)).toBeNull();
    });

    it('returns budget file credentials for the requested scope', () => {
      secretsService.set(testSecretName, 'global-value');
      secretsService.set(testSecretName, 'file-value', fileAId);

      expect(secretsService.get(testSecretName, fileAId)).toBe('file-value');
      expect(
        getAccountDb().first('SELECT value FROM secrets WHERE name = ?', [
          `${testSecretName}:${fileAId}`,
        ])?.value,
      ).toBe('file-value');
    });

    it('keeps budget file credentials when global credentials are saved later', () => {
      secretsService.set(testSecretName, 'file-value', fileAId);
      secretsService.set(testSecretName, 'global-value');

      expect(secretsService.get(testSecretName, fileAId)).toBe('file-value');
      expect(secretsService.get(testSecretName, fileBId)).toBeNull();
      expect(secretsService.get(testSecretName)).toBe('global-value');
    });

    it('resets only the scoped budget file credentials', () => {
      secretsService.set(testSecretName, 'global-value');
      secretsService.set(testSecretName, 'file-value', fileAId);

      expect(secretsService.reset(testSecretName, fileAId).deletedFrom).toBe(
        'per-budget-file',
      );
      expect(secretsService.get(testSecretName, fileAId)).toBeNull();
      expect(secretsService.get(testSecretName)).toBe('global-value');
    });
  });

  describe('secrets api', () => {
    beforeEach(() => {
      getAccountDb().mutate('DELETE FROM secrets WHERE name = ?', [
        testSecretName,
      ]);
      secretsService.reset(testSecretName);
      secretsService.reset(testSecretName, testFileId);
    });

    afterEach(() => {
      getAccountDb().mutate('DELETE FROM auth');
    });

    it('returns 401 if the user is not authenticated', async () => {
      secretsService.set(testSecretName, testSecretValue, testFileId);
      const res = await request(app).get(`/${testSecretName}`);

      expect(res.statusCode).toEqual(401);
      expect(res.body).toEqual({
        details: 'token-not-found',
        reason: 'unauthorized',
        status: 'error',
      });
    });

    it('returns 404 if secret does not exist', async () => {
      const res = await request(app)
        .get(`/${SecretName.gocardless_secretKey}`)
        .set('X-Actual-File-Id', 'test-file-id')
        .set('x-actual-token', 'valid-token');

      expect(res.statusCode).toEqual(404);
    });

    it('returns 404 for unknown secret names without revealing existence', async () => {
      const res = await request(app)
        .get('/thiskeydoesnotexist')
        .set('x-actual-token', 'valid-token');

      expect(res.statusCode).toEqual(404);
    });

    it('returns 204 if global secret exists', async () => {
      secretsService.set(testSecretName, testSecretValue);

      const res = await request(app)
        .get(`/${testSecretName}`)
        .set('x-actual-token', 'valid-token');

      expect(res.statusCode).toEqual(204);
    });

    it('returns 204 if budget file secret exists', async () => {
      secretsService.set(testSecretName, testSecretValue, testFileId);
      const res = await request(app)
        .get(`/${testSecretName}`)
        .set('X-Actual-File-Id', 'test-file-id')
        .set('x-actual-token', 'valid-token');

      expect(res.statusCode).toEqual(204);
    });

    it('returns 404 for global secrets when checking a budget file scope', async () => {
      secretsService.set(testSecretName, testSecretValue);

      const res = await request(app)
        .get(`/${testSecretName}`)
        .set('X-Actual-File-Id', testFileId)
        .set('x-actual-token', 'valid-token');

      expect(res.statusCode).toEqual(404);
    });

    it('returns 200 if secret was set', async () => {
      const res = await request(app)
        .post(`/`)
        .set('x-actual-token', 'valid-token')
        .send({
          name: testSecretName,
          value: testSecretValue,
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({
        status: 'ok',
      });
    });

    it('DELETE resets budget file credentials', async () => {
      secretsService.set(testSecretName, 'global-value');
      secretsService.set(testSecretName, 'file-value', testFileId);

      const res = await request(app)
        .delete(`/${testSecretName}`)
        .set('X-Actual-File-Id', testFileId)
        .set('x-actual-token', 'valid-token');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({
        status: 'ok',
      });
      expect(secretsService.get(testSecretName, testFileId)).toBeNull();
      expect(secretsService.get(testSecretName)).toBe('global-value');
    });

    it('DELETE resets global credentials', async () => {
      secretsService.set(testSecretName, 'global-value');

      const res = await request(app)
        .delete(`/${testSecretName}`)
        .set('x-actual-token', 'valid-token');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({
        status: 'ok',
      });
      expect(secretsService.get(testSecretName)).toBeNull();
    });

    it('POST returns 403 when a shared user tries to manage another user file credentials', async () => {
      getAccountDb().mutate(
        'INSERT INTO files (id, deleted, owner) VALUES (?, FALSE, ?)',
        ['shared-user-secret-file', 'genericAdmin'],
      );
      getAccountDb().mutate(
        'INSERT INTO user_access (file_id, user_id) VALUES (?, ?)',
        ['shared-user-secret-file', 'genericUser'],
      );

      const res = await request(app)
        .post('/')
        .set('X-Actual-File-Id', 'shared-user-secret-file')
        .set('x-actual-token', 'valid-token-user')
        .send({
          name: testSecretName,
          value: testSecretValue,
        });

      expect(res.statusCode).toEqual(403);
      expect(res.body).toEqual({
        status: 'error',
        reason: 'file-access-denied',
        details: "You don't have permissions over this file",
      });
      expect(
        secretsService.get(testSecretName, 'shared-user-secret-file'),
      ).toBeNull();
    });

    it('POST returns 400 for unknown secret names', async () => {
      const res = await request(app)
        .post('/')
        .set('x-actual-token', 'valid-token')
        .send({ name: 'thiskeydoesnotexist', value: 'whatever' });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({
        status: 'error',
        reason: 'invalid-secret-name',
        details: 'Unknown secret name',
      });
    });

    describe('when OpenID is the active auth method', () => {
      beforeEach(() => {
        enableOpenIdAuth();
        secretsService.set(testSecretName, testSecretValue, testFileId);
      });

      it('GET returns 403 when the user does not own the file', async () => {
        const res = await request(app)
          .get(`/${testSecretName}`)
          .set('X-Actual-File-Id', 'test-file-id')
          .set('x-actual-token', 'valid-token-user');

        expect(res.statusCode).toEqual(403);
        expect(res.body).toEqual({
          status: 'error',
          reason: 'file-access-denied',
          details: "You don't have permissions over this file",
        });
      });

      it('GET returns 204 for admin users when secret exists', async () => {
        const res = await request(app)
          .get(`/${testSecretName}`)
          .set('X-Actual-File-Id', 'test-file-id')
          .set('x-actual-token', 'valid-token-admin');

        expect(res.statusCode).toEqual(204);
      });

      it('POST returns 200 for non-admin file owners setting per-budget credentials', async () => {
        getAccountDb().mutate(
          'INSERT INTO files (id, deleted, owner) VALUES (?, FALSE, ?)',
          ['owner-secret-file', 'genericUser'],
        );

        const res = await request(app)
          .post('/')
          .set('X-Actual-File-Id', 'owner-secret-file')
          .set('x-actual-token', 'valid-token-user')
          .send({
            name: testSecretName,
            value: testSecretValue,
          });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual({ status: 'ok' });
        expect(secretsService.get(testSecretName, 'owner-secret-file')).toBe(
          testSecretValue,
        );
      });

      it('POST returns 403 for non-admin file owners setting global credentials', async () => {
        getAccountDb().mutate(
          'INSERT INTO files (id, deleted, owner) VALUES (?, FALSE, ?)',
          ['owner-global-secret-file', 'genericUser'],
        );

        const res = await request(app)
          .post('/')
          .set('x-actual-token', 'valid-token-user')
          .send({
            name: testSecretName,
            value: testSecretValue,
          });

        expect(res.statusCode).toEqual(403);
        expect(res.body).toEqual({
          status: 'error',
          reason: 'not-admin',
          details: 'You have to be admin to manage global secrets',
        });
        expect(secretsService.get(testSecretName)).toBeNull();
      });

      it('POST returns 200 for admin users', async () => {
        const res = await request(app)
          .post('/')
          .set('x-actual-token', 'valid-token-admin')
          .send({
            name: testSecretName,
            value: 'newValue',
          });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual({ status: 'ok' });
      });
    });
  });
});
