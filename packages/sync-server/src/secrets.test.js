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

      it('GET returns 403 for non-admin users', async () => {
        const res = await request(app)
          .get(`/${testSecretName}?fileId=test-file-id`)
          .set('x-actual-token', 'valid-token-user');

        expect(res.statusCode).toEqual(403);
        expect(res.body).toEqual({
          status: 'error',
          reason: 'not-admin',
          details: 'You have to be admin to read secrets',
        });
      });

      it('GET returns 204 for admin users when secret exists', async () => {
        const res = await request(app)
          .get(`/${testSecretName}?fileId=test-file-id`)
          .set('x-actual-token', 'valid-token-admin');

        expect(res.statusCode).toEqual(204);
      });

      it('POST returns 403 for non-admin users', async () => {
        const res = await request(app)
          .post('/')
          .set('x-actual-token', 'valid-token-user')
          .send({ name: testSecretName, value: testSecretValue });

        expect(res.statusCode).toEqual(403);
        expect(res.body).toEqual({
          status: 'error',
          reason: 'not-admin',
          details: 'You have to be admin to set secrets',
        });
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
