import request from 'supertest';

import { isValidRedirectUrl } from '#accounts/openid';
import type { ConfigParameter } from '#accounts/openid';

import { getAccountDb } from './account-db';
import { bootstrapPassword } from './accounts/password';
import { handlers as app, openIdConfigRateLimiter } from './app-openid';

function insertOpenIdAuth(extraData: ConfigParameter) {
  getAccountDb().mutate(
    'INSERT INTO auth (method, display_name, extra_data, active) VALUES (?, ?, ?, ?)',
    ['openid', 'OpenID', JSON.stringify(extraData), 1],
  );
}

describe('/config', () => {
  beforeEach(() => {
    openIdConfigRateLimiter.resetKey('127.0.0.1');
  });

  afterEach(() => {
    getAccountDb().mutate('DELETE FROM auth');
  });

  it('rejects config access after an owner has already been created', async () => {
    bootstrapPassword('bootstrap-password');
    insertOpenIdAuth({
      client_id: 'client-id',
      client_secret: 'client-secret',
      issuer: 'https://issuer.example.com',
    });

    const res = await request(app)
      .post('/config')
      .send({ password: 'bootstrap-password' });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toEqual({
      status: 'error',
      reason: 'already-bootstraped',
    });
  });
});

describe('isValidRedirectUrl', () => {
  afterEach(() => {
    getAccountDb().mutate('DELETE FROM auth');
  });

  function configureOpenIdServer(serverHostname: string) {
    insertOpenIdAuth({
      client_id: 'client-id',
      client_secret: 'client-secret',
      server_hostname: serverHostname,
      issuer: 'https://issuer.example.com',
    });
  }

  it('allows the configured server hostname and localhost', () => {
    configureOpenIdServer('https://my.actual.server');

    expect(isValidRedirectUrl('https://my.actual.server/openid-cb')).toBe(true);
    expect(isValidRedirectUrl('http://localhost:3010/openid-cb')).toBe(true);
  });

  it('allows the actualbudget: deep-link scheme used by the Mac App Store build', () => {
    configureOpenIdServer('https://my.actual.server');

    expect(
      isValidRedirectUrl('actualbudget://actual/openid-cb?token=abc'),
    ).toBe(true);
  });

  it('rejects unrelated hosts and malformed urls', () => {
    configureOpenIdServer('https://my.actual.server');

    expect(isValidRedirectUrl('https://evil.example.com/openid-cb')).toBe(
      false,
    );
    expect(isValidRedirectUrl('not a url')).toBe(false);
    expect(isValidRedirectUrl(undefined)).toBe(false);
  });

  it('rejects everything when no OpenID server is configured', () => {
    expect(isValidRedirectUrl('actualbudget://actual/openid-cb')).toBe(false);
  });
});
