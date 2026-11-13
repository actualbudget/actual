import { createHash, randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getAccountDb } from './account-db';
import { handlers as app } from './app-oauth';
import { config } from './load-config';
import type { OAuthClient } from './oauth-clients';
import { browserSessionCookie } from './util/oauth-browser-session';

const issuer = 'https://actual.example';
const clientId = 'browser-client';
const redirectUri = 'https://client.example/callback';
const verifier = 'v'.repeat(43);
const challenge = createHash('sha256').update(verifier).digest('base64url');
const query = `?${new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: 'code',
  code_challenge: challenge,
  code_challenge_method: 'S256',
  state: 'oauch_state_var',
}).toString()}`;

describe('standalone OAuth consent', () => {
  const db = getAccountDb();
  let userId: string, token: string, fileId: string;
  let previousClients: OAuthClient[];
  let previousIssuer: string;
  beforeEach(() => {
    previousClients = config.get('oauth.clients');
    previousIssuer = config.get('oauth.issuer');
    config.set('oauth.clients', [
      {
        clientId,
        name: 'Test client',
        logoUri: 'https://client.example/icon.svg',
        redirectUris: [redirectUri],
      },
    ]);
    config.set('oauth.issuer', issuer);
    userId = randomUUID();
    token = randomUUID();
    fileId = randomUUID();
    db.mutate(
      'INSERT INTO users (id, user_name, role, enabled) VALUES (?, ?, ?, 1)',
      [userId, userId, 'BASIC'],
    );
    db.mutate(
      'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, -1)',
      [token, userId],
    );
    db.mutate('INSERT INTO files (id, owner, name) VALUES (?, ?, ?)', [
      fileId,
      userId,
      'Shared budget',
    ]);
  });
  afterEach(() => {
    db.mutate('DELETE FROM api_keys WHERE user_id = ?', [userId]);
    db.mutate('DELETE FROM oauth_authorization_codes WHERE user_id = ?', [
      userId,
    ]);
    db.mutate('DELETE FROM sessions WHERE user_id = ?', [userId]);
    db.mutate('DELETE FROM files WHERE owner = ?', [userId]);
    db.mutate('DELETE FROM users WHERE id = ?', [userId]);
    config.set('oauth.clients', previousClients);
    config.set('oauth.issuer', previousIssuer);
  });
  function fetchConsent() {
    return request(app)
      .get(`/browser/request${query}`)
      .set('Cookie', `${browserSessionCookie}=${token}`);
  }
  function decide(
    path: string,
    csrfToken: string,
    authorizationQuery = query,
    origin = issuer,
    budget = fileId,
  ) {
    return request(app)
      .post(`/browser/${path}`)
      .set('Cookie', `${browserSessionCookie}=${token}`)
      .set('Origin', origin)
      .send({ csrfToken, authorizationQuery, fileId: budget });
  }
  it('shows accessible budgets and exchanges an approved code', async () => {
    const consent = await fetchConsent().expect(200);
    expect(consent.body.data.logoUri).toBe('https://client.example/icon.svg');
    expect(consent.body.data.budgets).toEqual([
      { id: fileId, name: 'Shared budget' },
    ]);
    const approved = await decide(
      'consent',
      consent.body.data.csrfToken,
    ).expect(200);
    const callback = new URL(approved.body.data.redirectUri);
    expect(callback.origin).toBe('https://client.example');
    expect(callback.searchParams.get('state')).toBe('oauch_state_var');
    const exchanged = await request(app)
      .post('/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code: callback.searchParams.get('code'),
        code_verifier: verifier,
      })
      .expect(200);
    expect(exchanged.body.token_type).toBe('Bearer');
  });
  it('rejects absent, expired, revoked, and disabled sessions', async () => {
    await request(app).get(`/browser/request${query}`).expect(401);
    db.mutate('UPDATE sessions SET expires_at = 1 WHERE token = ?', [token]);
    await fetchConsent().expect(401);
    db.mutate('UPDATE sessions SET expires_at = -1 WHERE token = ?', [token]);
    db.mutate('UPDATE users SET enabled = 0 WHERE id = ?', [userId]);
    await fetchConsent().expect(401);
    db.mutate('DELETE FROM sessions WHERE token = ?', [token]);
    const response = await fetchConsent().expect(401);
    expect(response.body.data.loginUrl).toBe(`/oauth/browser/login${query}`);
  });
  it('binds CSRF to the session, origin, and authorization request', async () => {
    const consent = await fetchConsent().expect(200),
      csrf = consent.body.data.csrfToken;
    await decide('consent', '').expect(403);
    await decide('consent', csrf, query, 'https://attacker.example').expect(
      403,
    );
    await decide(
      'consent',
      csrf,
      query.replace('oauch_state_var', 'different'),
    ).expect(403);
    const otherToken = randomUUID();
    db.mutate(
      'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, -1)',
      [otherToken, userId],
    );
    token = otherToken;
    await decide('consent', csrf).expect(403);
    expect(
      db.all('SELECT * FROM oauth_authorization_codes WHERE user_id = ?', [
        userId,
      ]),
    ).toHaveLength(0);
  });
  it('requires budget access and supports explicit denial', async () => {
    const consent = await fetchConsent().expect(200);
    await decide(
      'consent',
      consent.body.data.csrfToken,
      query,
      issuer,
      randomUUID(),
    ).expect(403);
    const denied = await decide('deny', consent.body.data.csrfToken).expect(
      200,
    );
    expect(
      new URL(denied.body.data.redirectUri).searchParams.get('error'),
    ).toBe('access_denied');
  });
  it('returns protocol errors without login and rejects unregistered callbacks', async () => {
    const unsupported = await request(app)
      .get(
        `/browser/request${query.replace('response_type=code', 'response_type=token')}`,
      )
      .expect(200);
    expect(
      new URLSearchParams(
        new URL(unsupported.body.data.redirectUri).hash.slice(1),
      ).get('error'),
    ).toBe('unsupported_response_type');
    await request(app)
      .get(`/browser/request${query}&client_id=attacker`)
      .expect(400);
    await request(app)
      .get(`/browser/request${query.replace('browser-client', 'attacker')}`)
      .expect(400);
  });
});
