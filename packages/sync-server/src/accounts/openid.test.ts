import { format } from 'node:util';

import createDebug from 'debug';
import type * as OpenIdClient from 'openid-client';

import { getAccountDb } from '#account-db';

import { loginWithOpenIdFinalize, loginWithOpenIdSetup } from './openid';

const provider = vi.hoisted(() => ({
  callback: vi.fn(),
  userinfo: vi.fn(),
}));

vi.mock('openid-client', async importOriginal => {
  const actual = await importOriginal<typeof OpenIdClient>();
  class Client {
    redirect_uris = ['https://actual.example/openid/callback'];
    callback = provider.callback;
    userinfo = provider.userinfo;
    authorizationUrl(params: Record<string, string>) {
      return `https://identity.example/authorize?${new URLSearchParams(params).toString()}`;
    }
  }
  return { ...actual, Issuer: { discover: async () => ({ Client }) } };
});

beforeEach(() => {
  getAccountDb().mutate("DELETE FROM sessions WHERE auth_method = 'openid'");
  getAccountDb().mutate(
    'INSERT INTO auth (method, active, extra_data) VALUES (?, 1, ?)',
    [
      'openid',
      JSON.stringify({
        issuer: 'https://identity.example',
        client_id: 'client',
        client_secret: 'secret',
        server_hostname: 'https://actual.example',
      }),
    ],
  );
  provider.callback.mockReset().mockResolvedValue({
    access_token: 'provider-token',
    claims: () => ({ iss: 'https://identity.example', sub: 'fixed-id' }),
  });
  provider.userinfo.mockReset().mockResolvedValue({
    sub: 'fixed-id',
    preferred_username: 'renamed-admin',
  });
});

afterEach(() => {
  const db = getAccountDb();
  db.mutate("DELETE FROM auth WHERE method = 'openid'");
  db.mutate('DELETE FROM pending_openid_requests');
  db.mutate(
    "DELETE FROM openid_identities WHERE provider = 'oidc:https://identity.example'",
  );
  db.mutate("DELETE FROM sessions WHERE auth_method = 'openid'");
});

it.each(['', 'actual:*', 'actual-sensitive:openid'])(
  'keeps provider details behind the sensitive namespace (%s)',
  async namespaces => {
    const previous = createDebug.disable();
    createDebug.enable(namespaces);
    const debugLog = vi
      .spyOn(createDebug, 'log')
      .mockImplementation(() => undefined);
    const secret = 'private-provider-code-and-token';
    const start = await loginWithOpenIdSetup('https://actual.example');
    const state = new URL(start.url ?? '').searchParams.get('state');
    provider.callback.mockRejectedValue(new Error(secret));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const result = await loginWithOpenIdFinalize({ code: secret, state });
      expect(result.error).toBeTruthy();
      expect(log).toHaveBeenCalled();
      expect(JSON.stringify(log.mock.calls)).not.toContain(secret);
      const details = debugLog.mock.calls
        .map(args => format(...args))
        .join('\n');
      expect(details.includes(secret)).toBe(
        namespaces === 'actual-sensitive:openid',
      );
      if (namespaces === 'actual-sensitive:openid') {
        expect(details).toContain('Error:');
        expect(details).toContain('openid.test.ts:');
      }
    } finally {
      log.mockRestore();
      debugLog.mockRestore();
      createDebug.enable(previous);
    }
  },
);

it('links an existing account on provider login and keeps it linked after a rename', async () => {
  const db = getAccountDb();
  const before = db.first('SELECT * FROM users WHERE id = ?', ['genericAdmin']);
  provider.userinfo.mockResolvedValue({
    sub: 'fixed-id',
    preferred_username: before.user_name,
  });

  async function login() {
    const start = await loginWithOpenIdSetup('https://actual.example');
    const state = new URL(start.url ?? '').searchParams.get('state');
    return loginWithOpenIdFinalize({ code: 'provider-code', state });
  }

  const first = await login();
  const token = new URL(first.url ?? '').searchParams.get('token');
  expect(
    db.first('SELECT user_id FROM sessions WHERE token = ?', [token]),
  ).toEqual({ user_id: 'genericAdmin' });
  expect(
    db.first('SELECT * FROM openid_identities WHERE user_id = ?', [
      'genericAdmin',
    ]),
  ).toEqual({
    provider: 'oidc:https://identity.example',
    subject: 'fixed-id',
    user_id: 'genericAdmin',
  });
  expect(
    db.first('SELECT * FROM users WHERE id = ?', ['genericAdmin']),
  ).toEqual(before);

  provider.userinfo.mockResolvedValue({
    sub: 'fixed-id',
    preferred_username: 'renamed-admin',
  });
  const renamed = await login();
  const nextToken = new URL(renamed.url ?? '').searchParams.get('token');
  expect(
    db.first('SELECT user_id FROM sessions WHERE token = ?', [nextToken]),
  ).toEqual({ user_id: 'genericAdmin' });
});
