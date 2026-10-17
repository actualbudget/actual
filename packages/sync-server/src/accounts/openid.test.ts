import { createHash } from 'node:crypto';
import { format } from 'node:util';

import createDebug from 'debug';
import type * as OpenIdClient from 'openid-client';

import { getAccountDb } from '#account-db';

import { exchangeHandoff } from './handoff';
import {
  isValidRedirectUrl,
  loginWithOpenIdFinalize,
  loginWithOpenIdSetup,
} from './openid';

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

const verifier = 'v'.repeat(43);
const challenge = createHash('sha256').update(verifier).digest('base64url');
const clientState = 's'.repeat(43);

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
    preferred_username: getAccountDb().first(
      'SELECT user_name FROM users WHERE id = ?',
      ['genericAdmin'],
    ).user_name,
  });
});

afterEach(() => {
  const db = getAccountDb();
  db.mutate("DELETE FROM auth WHERE method = 'openid'");
  db.mutate('DELETE FROM pending_openid_requests');
  db.mutate('DELETE FROM openid_handoffs');
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
    const start = await loginWithOpenIdSetup(
      'https://actual.example',
      '',
      clientState,
      challenge,
    );
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

it('binds provider completion to the client proof and consumes provider state once', async () => {
  const start = await loginWithOpenIdSetup(
    'https://actual.example',
    '',
    clientState,
    challenge,
  );
  const state = new URL(start.url ?? '').searchParams.get('state');
  const result = await loginWithOpenIdFinalize({
    code: 'provider-code',
    state,
  });
  const redirect = new URL(result.url ?? '');
  expect(redirect.origin).toBe('https://actual.example');
  expect(redirect.pathname).toBe('/openid-cb');
  expect(redirect.searchParams.get('state')).toBe(clientState);
  expect(redirect.searchParams.has('token')).toBe(false);
  expect(
    getAccountDb().all("SELECT * FROM sessions WHERE auth_method = 'openid'"),
  ).toHaveLength(0);
  expect(
    await loginWithOpenIdFinalize({ code: 'provider-code', state }),
  ).toEqual({ error: 'invalid-or-expired-state' });
  expect(provider.callback).toHaveBeenCalledTimes(1);
  expect(
    exchangeHandoff(redirect.searchParams.get('code'), verifier),
  ).toHaveProperty('token');
});

it('rejects expired provider attempts before contacting the provider', async () => {
  const start = await loginWithOpenIdSetup(
    'https://actual.example',
    '',
    clientState,
    challenge,
  );
  const state = new URL(start.url ?? '').searchParams.get('state');
  getAccountDb().mutate('UPDATE pending_openid_requests SET expiry_time = 0');
  expect(
    await loginWithOpenIdFinalize({ code: 'provider-code', state }),
  ).toEqual({ error: 'invalid-or-expired-state' });
  expect(provider.callback).not.toHaveBeenCalled();
});

it('rejects clients without a verifier challenge', async () => {
  expect(await loginWithOpenIdSetup('https://actual.example')).toEqual({
    error: 'invalid-client-challenge',
  });
});

it.each([
  'https://actual.example:444',
  'http://actual.example',
  'https://actual.example.evil',
  'http://localhost:9999',
  'ftp://actual.example',
])('rejects an unapproved return origin: %s', url => {
  expect(isValidRedirectUrl(url)).toBe(false);
});
