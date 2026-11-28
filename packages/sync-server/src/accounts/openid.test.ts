import { format } from 'node:util';

import createDebug from 'debug';
import type * as OpenIdClient from 'openid-client';

import { getAccountDb } from '#account-db';

import { loginWithOpenIdFinalize, loginWithOpenIdSetup } from './openid';

const provider = vi.hoisted(() => ({
  callback: vi.fn(),
  userinfo: vi.fn(),
  clientCreated: vi.fn(),
  metadata: {} as Record<string, unknown>,
}));

vi.mock('openid-client', async importOriginal => {
  const actual = await importOriginal<typeof OpenIdClient>();
  class Client {
    redirect_uris = ['https://actual.example/openid/callback'];
    constructor(options: Record<string, unknown>) {
      provider.clientCreated(options);
    }
    callback = provider.callback;
    userinfo = provider.userinfo;
    authorizationUrl(params: Record<string, string>) {
      return `https://identity.example/authorize?${new URLSearchParams(params).toString()}`;
    }
  }
  return {
    ...actual,
    Issuer: {
      discover: async () => ({ Client, metadata: provider.metadata }),
    },
  };
});

beforeEach(() => {
  provider.metadata = {};
  provider.clientCreated.mockReset();
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

it.each([
  ['the provider does not list algorithms', undefined, 'RS256'],
  ['the provider lists only RS256', ['RS256'], 'RS256'],
  [
    'the provider lists RS256 after another algorithm',
    ['ES256', 'RS256'],
    'RS256',
  ],
  ['the provider lists only ES256', ['ES256'], 'ES256'],
  ['the provider lists only EdDSA', ['EdDSA'], 'EdDSA'],
  [
    'the provider lists several non-RS256 algorithms',
    ['ES384', 'ES256'],
    'ES384',
  ],
  ['the provider lists only none', ['none'], 'RS256'],
  ['the provider lists none and ES256', ['none', 'ES256'], 'ES256'],
])(
  'signs ID tokens with the right algorithm when %s',
  async (_name, algs, expected) => {
    provider.metadata = algs
      ? { id_token_signing_alg_values_supported: algs }
      : {};

    const result = await loginWithOpenIdSetup('https://actual.example');

    expect(result.error).toBeUndefined();
    expect(provider.clientCreated).toHaveBeenCalledWith(
      expect.objectContaining({ id_token_signed_response_alg: expected }),
    );
  },
);

it.each([
  ['both algorithms are advertised', ['RS256', 'ES256'], 'ES256', 'ES256'],
  ['only RS256 is advertised', ['RS256'], 'EdDSA', 'EdDSA'],
  ['the provider lists no algorithms', undefined, 'ES384', 'ES384'],
  ['the override is empty', ['RS256', 'ES256'], '', 'RS256'],
])(
  'uses the configured ID token algorithm when %s',
  async (_name, algs, override, expected) => {
    provider.metadata = algs
      ? { id_token_signing_alg_values_supported: algs }
      : {};
    getAccountDb().mutate(
      "UPDATE auth SET extra_data = ? WHERE method = 'openid'",
      [
        JSON.stringify({
          issuer: 'https://identity.example',
          client_id: 'client',
          client_secret: 'secret',
          server_hostname: 'https://actual.example',
          id_token_signed_response_alg: override,
        }),
      ],
    );

    const result = await loginWithOpenIdSetup('https://actual.example');

    expect(result.error).toBeUndefined();
    expect(provider.clientCreated).toHaveBeenCalledWith(
      expect.objectContaining({ id_token_signed_response_alg: expected }),
    );
  },
);
