import { createHash } from 'node:crypto';

import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { authorizationServerMetadata, handlers } from './app-oauth';
import { config } from './load-config';
import type { OAuthClient } from './oauth-clients';

describe('OAuth protocol boundaries', () => {
  const clientId = 'protocol-test-client';
  const redirectUri = 'https://client.example/callback';
  const verifier = 'v'.repeat(43);
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const state = 'state-value-for-protocol-test';
  const client: OAuthClient = {
    clientId,
    name: 'Protocol test client',
    redirectUris: [redirectUri],
  };
  let previousClients: OAuthClient[];
  let previousIssuer: string;

  beforeEach(() => {
    previousClients = config.get('oauth.clients');
    previousIssuer = config.get('oauth.issuer');
    config.set('oauth.clients', [client]);
    config.set('oauth.issuer', 'https://actual.example');
  });

  afterEach(() => {
    config.set('oauth.clients', previousClients);
    config.set('oauth.issuer', previousIssuer);
  });

  function authorizationQuery() {
    return {
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    };
  }

  it('rejects POST authorization without applying cross-origin isolation', async () => {
    const response = await request(handlers)
      .post('/authorize')
      .type('form')
      .send(authorizationQuery());
    expect(response.status).toBe(405);
    expect(response.headers.allow).toBe('GET');
    expect(response.headers['cross-origin-opener-policy']).toBeUndefined();
  });

  it('rejects unsupported scope and repeated authorization parameters without forwarding to unregistered URLs', async () => {
    const scope = await request(handlers)
      .get('/authorize')
      .query({ ...authorizationQuery(), scope: 'read' });
    expect(scope.status).toBe(302);
    expect(new URL(scope.headers.location).searchParams.get('error')).toBe(
      'invalid_scope',
    );

    const duplicate = await request(handlers).get(
      `/authorize?${new URLSearchParams(authorizationQuery()).toString()}&state=other`,
    );
    expect(duplicate.status).toBe(302);
    expect(new URL(duplicate.headers.location).searchParams.get('error')).toBe(
      'invalid_request',
    );

    const unregistered = await request(handlers)
      .get('/authorize')
      .query({
        ...authorizationQuery(),
        redirect_uri: 'https://attacker.example/callback',
      });
    expect(unregistered.status).toBe(400);
    expect(unregistered.headers.location).toBeUndefined();
  });

  it('returns invalid_request for malformed token requests', async () => {
    const valid = {
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code: 'authorization-code',
      code_verifier: verifier,
    };
    const responses = [
      request(handlers).post('/token').type('json').send(valid),
      request(handlers)
        .post('/token')
        .type('form')
        .send({ ...valid, grant_type: undefined }),
      request(handlers)
        .post('/token')
        .type('form')
        .send({ ...valid, client_id: undefined }),
      request(handlers)
        .post('/token')
        .type('form')
        .send({ ...valid, redirect_uri: undefined }),
      request(handlers)
        .post('/token')
        .type('form')
        .send({ ...valid, code: undefined }),
      request(handlers)
        .post('/token')
        .type('form')
        .send({ ...valid, code_verifier: undefined }),
      request(handlers)
        .post('/token')
        .type('form')
        .send(
          `grant_type=authorization_code&client_id=${clientId}&client_id=other&redirect_uri=${redirectUri}&code=code&code_verifier=${verifier}`,
        ),
    ];
    for (const response of await Promise.all(responses)) {
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_request');
      expect(response.headers['cache-control']).toContain('no-store');
      expect(response.headers.pragma).toBe('no-cache');
    }
  });

  it('classifies unsupported token grants separately', async () => {
    const unsupported = await request(handlers)
      .post('/token')
      .type('form')
      .send({
        grant_type: 'password',
        client_id: clientId,
        redirect_uri: redirectUri,
        code: 'authorization-code',
        code_verifier: verifier,
      });
    expect(unsupported.status).toBe(400);
    expect(unsupported.body.error).toBe('unsupported_grant_type');
  });

  it('publishes endpoints from configured issuer rather than request host', async () => {
    const app = express();
    app.get(
      '/.well-known/oauth-authorization-server',
      authorizationServerMetadata,
    );
    const metadata = await request(app)
      .get('/.well-known/oauth-authorization-server')
      .set('Host', 'attacker.example');
    expect(metadata.status).toBe(200);
    expect(metadata.body).toMatchObject({
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
    expect(metadata.body.scopes_supported).toBeUndefined();
    expect(metadata.body.registration_endpoint).toBeUndefined();
  });
});
