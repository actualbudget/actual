import { createHash, randomUUID } from 'node:crypto';

import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getAccountDb } from './account-db';
import { handlers as app, authorizationServerMetadata } from './app-oauth';
import { config } from './load-config';
import type { OAuthClient } from './oauth-clients';
import { browserSessionCookie } from './util/oauth-browser-session';

const issuer = 'https://actual.example';

describe('OAuth authorization code flow', () => {
  const db = getAccountDb();
  const clientId = 'budget-automation';
  const redirectUri = 'https://automation.example/callback';
  let userId: string;
  let session: string;
  let fileId: string;
  let verifier: string;
  let challenge: string;
  let previousClients: OAuthClient[];
  let previousIssuer: string;

  beforeEach(() => {
    previousClients = config.get('oauth.clients');
    previousIssuer = config.get('oauth.issuer');
    config.set('oauth.clients', [
      { clientId, name: 'Budget automation', redirectUris: [redirectUri] },
    ]);
    config.set('oauth.issuer', issuer);
    userId = randomUUID();
    session = randomUUID();
    fileId = randomUUID();
    verifier = 'a'.repeat(43);
    challenge = createHash('sha256').update(verifier).digest('base64url');
    db.mutate(
      'INSERT INTO users (id, user_name, role, enabled) VALUES (?, ?, ?, 1)',
      [userId, userId, 'BASIC'],
    );
    db.mutate(
      'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, -1)',
      [session, userId],
    );
    db.mutate('INSERT INTO files (id, owner, name) VALUES (?, ?, ?)', [
      fileId,
      userId,
      'OAuth test',
    ]);
  });

  afterEach(() => {
    db.mutate('DELETE FROM api_keys WHERE user_id = ?', [userId]);
    db.mutate('DELETE FROM oauth_authorization_codes WHERE user_id = ?', [
      userId,
    ]);
    db.mutate('DELETE FROM sessions WHERE user_id = ?', [userId]);
    db.mutate('DELETE FROM users WHERE id = ?', [userId]);
    db.mutate('DELETE FROM files WHERE id = ?', [fileId]);
    config.set('oauth.clients', previousClients);
    config.set('oauth.issuer', previousIssuer);
  });

  function authorizationQuery(
    state = 'state-value-that-is-long-enough',
    requestClientId = clientId,
    requestRedirectUri = redirectUri,
  ) {
    return `?${new URLSearchParams({
      response_type: 'code',
      client_id: requestClientId,
      redirect_uri: requestRedirectUri,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
    }).toString()}`;
  }

  function fetchConsent(query = authorizationQuery()) {
    return request(app)
      .get(`/browser/request${query}`)
      .set('Cookie', `${browserSessionCookie}=${session}`);
  }

  async function authorize(query = authorizationQuery()) {
    const details = await fetchConsent(query).expect(200);
    const consent = await request(app)
      .post('/browser/consent')
      .set('Cookie', `${browserSessionCookie}=${session}`)
      .set('Origin', issuer)
      .send({
        authorizationQuery: query,
        csrfToken: details.body.data.csrfToken,
        fileId,
      })
      .expect(200);
    const callback = new URL(consent.body.data.redirectUri);
    return { consent, callback, code: callback.searchParams.get('code') };
  }

  it.each(['oauch_state_var', 'x', 'x'.repeat(513)])(
    'preserves opaque client state without imposing a length restriction (%s)',
    async state => {
      const { callback } = await authorize(authorizationQuery(state));
      expect(callback.searchParams.get('state')).toBe(state);
    },
  );

  it('exchanges one PKCE code for a key scoped to the selected budget, then revokes that key', async () => {
    const { consent, callback, code } = await authorize();
    expect(consent.status).toBe(200);
    expect(callback.origin).toBe('https://automation.example');
    expect(callback.searchParams.get('state')).toBe(
      'state-value-that-is-long-enough',
    );
    expect(code).toBeTruthy();
    const exchange = () =>
      request(app).post('/token').type('form').send({
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code,
        code_verifier: verifier,
      });
    const token = await exchange();
    expect(token.status).toBe(200);
    expect(token.headers['cache-control']).toContain('no-store');
    expect(token.headers.pragma).toBe('no-cache');
    expect(
      db.first('SELECT name FROM api_keys WHERE user_id = ?', [userId]).name,
    ).toBe('Budget automation');
    expect(token.body).toMatchObject({
      token_type: 'Bearer',
      access_token: expect.stringMatching(/^actual_/),
    });
    const key = db.first('SELECT id FROM api_keys WHERE key_hash = ?', [
      createHash('sha256').update(token.body.access_token).digest('hex'),
    ]);
    expect(
      db.all('SELECT file_id FROM api_key_budgets WHERE key_id = ?', [key.id]),
    ).toEqual([{ file_id: fileId }]);
    expect((await exchange()).status).toBe(400);
    expect(
      (
        await request(app)
          .post('/revoke')
          .type('form')
          .send({ client_id: clientId, token: token.body.access_token })
      ).status,
    ).toBe(200);
    expect(
      db.first('SELECT id FROM api_keys WHERE id = ?', [key.id]),
    ).toBeNull();
    const otherToken = 'actual_' + 'x'.repeat(43);
    const otherKeyId = randomUUID();
    db.mutate(
      'INSERT INTO api_keys (id, user_id, name, key_hash, created_at) VALUES (?, ?, ?, ?, ?)',
      [
        otherKeyId,
        userId,
        'Manual key',
        createHash('sha256').update(otherToken).digest('hex'),
        Math.floor(Date.now() / 1000),
      ],
    );
    await request(app)
      .post('/revoke')
      .type('form')
      .send({ client_id: clientId, token: otherToken })
      .expect(200);
    expect(
      db.first('SELECT id FROM api_keys WHERE id = ?', [otherKeyId]),
    ).not.toBeNull();
    await request(app)
      .post('/revoke')
      .type('form')
      .send({ client_id: clientId, token: 'unknown' })
      .expect(200);
  });

  it('rejects an unregistered redirect and an incorrect verifier without consuming a valid code', async () => {
    const badRedirect = await fetchConsent(
      authorizationQuery(
        'state-value-that-is-long-enough',
        clientId,
        'https://attacker.example/callback',
      ),
    );
    expect(badRedirect.status).toBe(400);
    const { code } = await authorize();
    const wrongVerifier = await request(app)
      .post('/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code,
        code_verifier: 'b'.repeat(43),
      });
    expect(wrongVerifier.status).toBe(400);
    const correct = await request(app).post('/token').type('form').send({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
      code_verifier: verifier,
    });
    expect(correct.status).toBe(200);
  });

  it('does not issue a key after the approving user is disabled', async () => {
    const { code } = await authorize();
    db.mutate('UPDATE users SET enabled = 0 WHERE id = ?', [userId]);
    const result = await request(app).post('/token').type('form').send({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
      code_verifier: verifier,
    });
    expect(result.status).toBe(400);
    expect(
      db.all('SELECT id FROM api_keys WHERE user_id = ?', [userId]),
    ).toHaveLength(0);
  });
  it('uses registered names for independent clients and rejects mismatched callbacks', async () => {
    const secondClient = {
      clientId: 'another-client',
      name: 'Another application',
      redirectUris: ['https://another.example/callback'],
    };
    config.set('oauth.clients', [
      { clientId, name: 'Budget automation', redirectUris: [redirectUri] },
      secondClient,
    ]);
    const secondQuery = authorizationQuery(
      'state-value-that-is-long-enough',
      secondClient.clientId,
      secondClient.redirectUris[0],
    );
    const details = await fetchConsent(secondQuery);
    expect(details.status).toBe(200);
    expect(details.body.data.clientName).toBe(secondClient.name);
    const mismatch = await fetchConsent(
      authorizationQuery(
        'state-value-that-is-long-enough',
        secondClient.clientId,
        redirectUri,
      ),
    );
    expect(mismatch.status).toBe(400);
    expect(
      (await request(app).get(`/browser/request${authorizationQuery()}`))
        .status,
    ).toBe(401);
  });

  it('rejects an expired authorization code', async () => {
    const { code } = await authorize();
    db.mutate(
      'UPDATE oauth_authorization_codes SET expires_at = 0 WHERE user_id = ?',
      [userId],
    );
    const result = await request(app).post('/token').type('form').send({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
      code_verifier: verifier,
    });
    expect(result.status).toBe(400);
    expect(
      db.all('SELECT id FROM api_keys WHERE user_id = ?', [userId]),
    ).toHaveLength(0);
  });

  it('validates browser authorization requests and returns trusted discovery metadata', async () => {
    const badResponseType = await request(app).get('/authorize').query({
      response_type: 'token',
      client_id: clientId,
      redirect_uri: redirectUri,
      state: 'state-value-that-is-long-enough',
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    expect(badResponseType.status).toBe(302);
    expect(badResponseType.headers.location).toContain(
      'error=unsupported_response_type',
    );
    const unsupportedScope = await request(app).get('/authorize').query({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state: 'state-value-that-is-long-enough',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      scope: 'read',
    });
    expect(unsupportedScope.headers.location).toContain('error=invalid_scope');
    const metadataApp = express();
    metadataApp.get('/', authorizationServerMetadata);
    config.set('oauth.issuer', 'https://actual.example');
    const metadata = await request(metadataApp).get('/');
    expect(metadata.body).toEqual({
      issuer: 'https://actual.example',
      authorization_endpoint: 'https://actual.example/oauth/authorize',
      token_endpoint: 'https://actual.example/oauth/token',
      revocation_endpoint: 'https://actual.example/oauth/revoke',
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      token_endpoint_auth_methods_supported: [
        'client_secret_basic',
        'client_secret_post',
        'none',
      ],
      code_challenge_methods_supported: ['S256'],
    });
  });
});
