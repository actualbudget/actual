import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getAccountDb } from '#account-db';

import { loginWithOpenIdFinalize } from './openid';

const openIdClientMocks = vi.hoisted(() => ({
  callback: vi.fn(),
  grant: vi.fn(),
  userinfo: vi.fn(),
}));

vi.mock('openid-client', () => ({
  custom: {
    setHttpOptionsDefaults: vi.fn(),
  },
  generators: {
    state: vi.fn(() => 'generated-state'),
    codeVerifier: vi.fn(() => 'generated-code-verifier'),
    codeChallenge: vi.fn(() => 'generated-code-challenge'),
  },
  Issuer: {
    discover: vi.fn(async () => ({
      Client: class MockClient {
        redirect_uris = ['https://actual.example/openid/callback'];
        authorizationUrl = vi.fn(() => 'https://provider.example/authorize');
        callback = openIdClientMocks.callback;
        grant = openIdClientMocks.grant;
        userinfo = openIdClientMocks.userinfo;
      },
    })),
  },
}));

const insertOpenIdAuth = () => {
  getAccountDb().mutate(
    'INSERT INTO auth (method, display_name, extra_data, active) VALUES (?, ?, ?, ?)',
    [
      'openid',
      'OpenID',
      JSON.stringify({
        issuer: 'https://provider.example',
        client_id: 'client-id',
        client_secret: 'client-secret',
        server_hostname: 'https://actual.example',
      }),
      1,
    ],
  );
};

const insertUser = (id: string, userName: string, owner = 0) => {
  getAccountDb().mutate(
    'INSERT INTO users (id, user_name, display_name, enabled, owner, role) VALUES (?, ?, ?, 1, ?, ?)',
    [id, userName, userName, owner, owner ? 'ADMIN' : 'BASIC'],
  );
};

const insertPendingRequest = () => {
  getAccountDb().mutate(
    'INSERT INTO pending_openid_requests (state, code_verifier, return_url, expiry_time) VALUES (?, ?, ?, ?)',
    ['state', 'code-verifier', 'https://actual.example', Date.now() + 300_000],
  );
};

const resetOpenIdTestData = () => {
  const accountDb = getAccountDb();
  accountDb.mutate('DELETE FROM sessions WHERE auth_method = ?', ['openid']);
  accountDb.mutate('DELETE FROM pending_openid_requests');
  accountDb.mutate('DELETE FROM auth');
  accountDb.mutate(
    "DELETE FROM users WHERE id IN ('openid-owner', 'openid-user')",
  );
};

describe('loginWithOpenIdFinalize', () => {
  beforeEach(() => {
    openIdClientMocks.callback.mockReset();
    openIdClientMocks.grant.mockReset();
    openIdClientMocks.userinfo.mockReset();

    resetOpenIdTestData();
  });

  afterEach(() => {
    resetOpenIdTestData();
  });

  it('matches a manually created user by email when the primary OpenID claim differs', async () => {
    insertOpenIdAuth();
    insertUser('openid-owner', 'owner-claim', 1);
    insertUser('openid-user', 'jane-email-claim');
    insertPendingRequest();

    openIdClientMocks.callback.mockResolvedValue({
      access_token: 'provider-access-token',
      expires_at: 123456,
    });
    openIdClientMocks.userinfo.mockResolvedValue({
      preferred_username: 'entra-object-id',
      email: 'jane-email-claim',
      name: 'Jane Example',
      sub: 'entra-subject',
    });

    const result = await loginWithOpenIdFinalize({
      code: 'authorization-code',
      state: 'state',
    });

    expect(result).toEqual({
      url: expect.stringContaining('/openid-cb?token='),
    });
    expect(
      getAccountDb().first(
        'SELECT auth_method FROM sessions WHERE user_id = ? AND auth_method = ?',
        ['openid-user', 'openid'],
      ),
    ).toEqual({ auth_method: 'openid' });
  });
});
