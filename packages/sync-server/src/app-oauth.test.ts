import { createHash, randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getAccountDb } from './account-db';
import { handlers as app } from './app-oauth';
import { config } from './load-config';
import type { OAuthClient } from './oauth-clients';

describe('OAuth token endpoints', () => {
  const db = getAccountDb();
  const clientId = 'budget-automation';
  const redirectUri = 'https://automation.example/callback';
  const verifier = 'v'.repeat(43);
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  let previousClients: OAuthClient[];
  let userId: string;
  let fileId: string;
  let keyId: string | undefined;

  beforeEach(() => {
    previousClients = config.get('oauth.clients');
    config.set('oauth.clients', [
      { clientId, name: 'Budget automation', redirectUris: [redirectUri] },
    ]);
    userId = randomUUID();
    fileId = randomUUID();
    db.mutate(
      'INSERT INTO users (id, user_name, role, enabled) VALUES (?, ?, ?, 1)',
      [userId, userId, 'BASIC'],
    );
    db.mutate('INSERT INTO files (id, owner, name) VALUES (?, ?, ?)', [
      fileId,
      userId,
      'OAuth test budget',
    ]);
  });

  afterEach(() => {
    if (keyId) db.mutate('DELETE FROM api_keys WHERE id = ?', [keyId]);
    db.mutate('DELETE FROM oauth_authorization_codes WHERE user_id = ?', [
      userId,
    ]);
    db.mutate('DELETE FROM users WHERE id = ?', [userId]);
    db.mutate('DELETE FROM files WHERE id = ?', [fileId]);
    config.set('oauth.clients', previousClients);
  });

  it('exchanges a single-use PKCE code for a budget-scoped bearer token', async () => {
    const code = randomUUID();
    const codeHash = createHash('sha256').update(code).digest('hex');
    db.mutate(
      `INSERT INTO oauth_authorization_codes
       (code_hash, client_id, redirect_uri, code_challenge, user_id, file_id, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        codeHash,
        clientId,
        redirectUri,
        challenge,
        userId,
        fileId,
        Math.floor(Date.now() / 1000) + 120,
      ],
    );

    const exchange = () =>
      request(app).post('/token').type('form').send({
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code,
        code_verifier: verifier,
      });

    const response = await exchange().expect(200);
    expect(response.body).toMatchObject({
      token_type: 'Bearer',
      access_token: expect.stringMatching(/^actual_/),
    });
    expect(response.headers['cache-control']).toContain('no-store');
    const key = db.first('SELECT id FROM api_keys WHERE key_hash = ?', [
      createHash('sha256').update(response.body.access_token).digest('hex'),
    ]);
    keyId = key.id;
    expect(
      db.all('SELECT file_id FROM api_key_budgets WHERE key_id = ?', [keyId]),
    ).toEqual([{ file_id: fileId }]);
    await exchange().expect(400);
    expect(
      db.first('SELECT id FROM api_keys WHERE id = ?', [keyId]),
    ).toBeNull();

    await request(app)
      .post('/revoke')
      .type('form')
      .send({ client_id: clientId, token: response.body.access_token })
      .expect(200);
    expect(
      db.first('SELECT id FROM api_keys WHERE id = ?', [keyId]),
    ).toBeNull();
    keyId = undefined;
  });

  it('requires a configured client secret using HTTP Basic authentication', async () => {
    const clientSecret = 'oauch-test-secret';
    config.set('oauth.clients', [
      {
        clientId,
        name: 'Budget automation',
        clientSecret,
        redirectUris: [redirectUri],
      },
    ]);
    const code = randomUUID();
    db.mutate(
      `INSERT INTO oauth_authorization_codes
       (code_hash, client_id, redirect_uri, code_challenge, user_id, file_id, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        createHash('sha256').update(code).digest('hex'),
        clientId,
        redirectUri,
        challenge,
        userId,
        fileId,
        Math.floor(Date.now() / 1000) + 120,
      ],
    );
    const form = {
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
      code_verifier: verifier,
    };

    await request(app)
      .post('/token')
      .type('form')
      .send(form)
      .expect(401, { error: 'invalid_client' });

    const response = await request(app)
      .post('/token')
      .type('form')
      .auth(clientId, clientSecret)
      .send({ ...form, client_id: undefined })
      .expect(200);
    expect(response.body).toMatchObject({
      token_type: 'Bearer',
      access_token: expect.stringMatching(/^actual_/),
    });
    const key = db.first('SELECT id FROM api_keys WHERE key_hash = ?', [
      createHash('sha256').update(response.body.access_token).digest('hex'),
    ]);
    keyId = key.id;

    await request(app)
      .post('/revoke')
      .type('form')
      .send({ client_id: clientId, token: response.body.access_token })
      .expect(401, { error: 'invalid_client' });

    await request(app)
      .post('/revoke')
      .type('form')
      .auth(clientId, clientSecret)
      .send({ token: response.body.access_token })
      .expect(200);
    expect(
      db.first('SELECT id FROM api_keys WHERE id = ?', [keyId]),
    ).toBeNull();
    keyId = undefined;
  });
});
