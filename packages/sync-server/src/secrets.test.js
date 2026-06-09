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
  const testOptions = { fileId: 'test-file-id' };

  it('should set a secret', () => {
    const result = secretsService.set(
      testSecretName,
      testSecretValue,
      testOptions,
    );
    expect(result).toBeDefined();
    expect(result.changes).toBe(1);
  });

  it('should get a secret', () => {
    const result = secretsService.get(testSecretName, testOptions);
    expect(result).toBeDefined();
    expect(result).toBe(testSecretValue);
  });

  it('should check if a secret exists', () => {
    const exists = secretsService.exists(testSecretName, testOptions);
    expect(exists).toBe(true);

    const nonExistent = secretsService.exists('nonExistentSecret', testOptions);
    expect(nonExistent).toBe(false);
  });

  it('should update a secret', () => {
    const newValue = 'newValue';
    const setResult = secretsService.set(testSecretName, newValue, testOptions);
    expect(setResult).toBeDefined();
    expect(setResult.changes).toBe(1);

    const getResult = secretsService.get(testSecretName, testOptions);
    expect(getResult).toBeDefined();
    expect(getResult).toBe(newValue);
  });

  it('should throw when fileId is missing', () => {
    expect(() => secretsService.set(testSecretName, testSecretValue)).toThrow(
      'missing-file-id',
    );
    expect(() => secretsService.get(testSecretName)).toThrow('missing-file-id');
    expect(() => secretsService.exists(testSecretName)).toThrow(
      'missing-file-id',
    );
  });

  describe('two-tier credentials', () => {
    const fileAOptions = { fileId: 'test-file-a' };
    const fileBOptions = { fileId: 'test-file-b' };

    beforeEach(() => {
      getAccountDb().mutate('DELETE FROM secrets WHERE name = ?', [
        testSecretName,
      ]);
    });

    it('falls back to global credentials when a budget file credential is missing', () => {
      secretsService.set(testSecretName, 'global-value', {
        ...fileAOptions,
        perBudgetFile: false,
      });

      expect(secretsService.get(testSecretName, fileAOptions)).toBe(
        'global-value',
      );
      expect(secretsService.getSource(testSecretName, fileAOptions)).toBe(
        'global',
      );
    });

    it('uses budget file credentials before global credentials', () => {
      secretsService.set(testSecretName, 'global-value', {
        ...fileAOptions,
        perBudgetFile: false,
      });
      secretsService.set(testSecretName, 'file-value', fileAOptions);

      expect(secretsService.get(testSecretName, fileAOptions)).toBe(
        'file-value',
      );
      expect(secretsService.getSource(testSecretName, fileAOptions)).toBe(
        'per-budget-file',
      );
    });

    it('keeps budget file credentials when global credentials are saved later', () => {
      secretsService.set(testSecretName, 'file-value', fileAOptions);
      secretsService.set(testSecretName, 'global-value', {
        ...fileBOptions,
        perBudgetFile: false,
      });

      expect(secretsService.get(testSecretName, fileAOptions)).toBe(
        'file-value',
      );
      expect(secretsService.get(testSecretName, fileBOptions)).toBe(
        'global-value',
      );
    });

    it('resets budget file credentials before global credentials', () => {
      secretsService.set(testSecretName, 'global-value', {
        ...fileAOptions,
        perBudgetFile: false,
      });
      secretsService.set(testSecretName, 'file-value', fileAOptions);

      expect(
        secretsService.reset(testSecretName, fileAOptions).deletedFrom,
      ).toBe('per-budget-file');
      expect(secretsService.get(testSecretName, fileAOptions)).toBe(
        'global-value',
      );

      expect(
        secretsService.reset(testSecretName, fileAOptions).deletedFrom,
      ).toBe('global');
      expect(secretsService.get(testSecretName, fileAOptions)).toBeNull();
    });
  });

  describe('secrets api', () => {
    afterEach(() => {
      getAccountDb().mutate('DELETE FROM auth');
    });

    it('returns 401 if the user is not authenticated', async () => {
      secretsService.set(testSecretName, testSecretValue, testOptions);
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
        .get(`/${SecretName.gocardless_secretKey}?fileId=test-file-id`)
        .set('x-actual-token', 'valid-token');

      expect(res.statusCode).toEqual(404);
    });

    it('returns 404 for unknown secret names without revealing existence', async () => {
      const res = await request(app)
        .get('/thiskeydoesnotexist')
        .set('x-actual-token', 'valid-token');

      expect(res.statusCode).toEqual(404);
    });

    it('returns 204 if secret exists', async () => {
      secretsService.set(testSecretName, testSecretValue, testOptions);
      const res = await request(app)
        .get(`/${testSecretName}?fileId=test-file-id`)
        .set('x-actual-token', 'valid-token');

      expect(res.statusCode).toEqual(204);
    });

    it('returns 200 if secret was set', async () => {
      const res = await request(app)
        .post(`/`)
        .set('x-actual-token', 'valid-token')
        .send({
          name: testSecretName,
          value: testSecretValue,
          fileId: 'test-file-id',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({
        status: 'ok',
      });
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
        .set('x-actual-token', 'valid-token-user')
        .send({
          name: testSecretName,
          value: testSecretValue,
          fileId: 'shared-user-secret-file',
        });

      expect(res.statusCode).toEqual(403);
      expect(res.body).toEqual({
        status: 'error',
        reason: 'file-access-denied',
        details: "You don't have permissions over this file",
      });
      expect(
        secretsService.getPerBudgetFile(testSecretName, {
          fileId: 'shared-user-secret-file',
        }),
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
        secretsService.set(testSecretName, testSecretValue, testOptions);
      });

      it('GET returns 403 when the user does not own the file', async () => {
        const res = await request(app)
          .get(`/${testSecretName}?fileId=test-file-id`)
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
          .get(`/${testSecretName}?fileId=test-file-id`)
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
          .set('x-actual-token', 'valid-token-user')
          .send({
            name: testSecretName,
            value: testSecretValue,
            fileId: 'owner-secret-file',
          });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual({ status: 'ok' });
        expect(
          secretsService.getPerBudgetFile(testSecretName, {
            fileId: 'owner-secret-file',
          }),
        ).toBe(testSecretValue);
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
            fileId: 'owner-global-secret-file',
            perBudgetFile: false,
          });

        expect(res.statusCode).toEqual(403);
        expect(res.body).toEqual({
          status: 'error',
          reason: 'not-admin',
          details: 'You have to be admin to manage global secrets',
        });
        expect(secretsService.getGlobal(testSecretName)).toBeNull();
      });

      it('POST returns 200 for admin users', async () => {
        const res = await request(app)
          .post('/')
          .set('x-actual-token', 'valid-token-admin')
          .send({
            name: testSecretName,
            value: 'newValue',
            fileId: 'test-file-id',
          });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual({ status: 'ok' });
      });
    });
  });
});
