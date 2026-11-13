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

it('binds browser consent login to its nonce and consumes the OIDC state', async () => {
  const { hashBrowserNonce } = await import('../util/oauth-browser-session');
  const nonce = 'test-browser-nonce';
  const query = '?client_id=test&state=opaque';
  const start = await loginWithOpenIdSetup('https://actual.example', '', {
    query,
    nonceHash: hashBrowserNonce(nonce),
  });
  const state = new URL(start.url ?? '').searchParams.get('state');
  const result = await loginWithOpenIdFinalize(
    { code: 'code', state },
    'wrong-browser',
  );
  expect(result.error).toBe('invalid-browser-login');
  expect(provider.callback).not.toHaveBeenCalled();
  provider.callback.mockRejectedValueOnce(new Error('provider rejected code'));
  await loginWithOpenIdFinalize({ code: 'code', state }, nonce);
  expect(provider.callback).toHaveBeenCalledOnce();
  const replay = await loginWithOpenIdFinalize({ code: 'code', state }, nonce);
  expect(replay.error).toBe('invalid-or-expired-state');
});
