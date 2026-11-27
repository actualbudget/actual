import type * as OpenIdClient from 'openid-client';

import { getAccountDb } from '#account-db';
import { config } from '#load-config';

import { isValidRedirectUrl, loginWithOpenIdSetup } from './openid';

const createdClients = vi.hoisted(() => [] as Array<{ redirect_uri: string }>);

vi.mock('openid-client', async importOriginal => {
  const actual = await importOriginal<typeof OpenIdClient>();
  class Client {
    constructor(options: { redirect_uri: string }) {
      createdClients.push(options);
    }
    authorizationUrl() {
      return 'https://identity.example/authorize';
    }
  }
  return { ...actual, Issuer: { discover: async () => ({ Client }) } };
});

function setConfiguredServerHostname(value: string) {
  const previous = config.get('openId.server_hostname');
  config.set('openId.server_hostname', value);
  onTestFinished(() => {
    config.set('openId.server_hostname', previous);
  });
}

beforeEach(() => {
  createdClients.length = 0;
  getAccountDb().mutate(
    'INSERT INTO auth (method, active, extra_data) VALUES (?, 1, ?)',
    [
      'openid',
      JSON.stringify({
        issuer: 'https://identity.example',
        client_id: 'client',
        client_secret: 'secret',
        // Saved when OpenID was set up from the UI on the old address.
        server_hostname: 'https://old.example',
      }),
    ],
  );
});

afterEach(() => {
  const db = getAccountDb();
  db.mutate("DELETE FROM auth WHERE method = 'openid'");
  db.mutate('DELETE FROM pending_openid_requests');
});

describe('OpenID server hostname', () => {
  it('uses the saved server hostname when none is configured', async () => {
    setConfiguredServerHostname('');

    const result = await loginWithOpenIdSetup('https://old.example');

    expect(result).toEqual({ url: 'https://identity.example/authorize' });
    expect(createdClients.map(client => client.redirect_uri)).toEqual([
      'https://old.example/openid/callback',
    ]);
    expect(isValidRedirectUrl('https://actual.example')).toBe(false);
  });

  it('prefers the configured server hostname over the saved one', async () => {
    setConfiguredServerHostname('https://actual.example');

    const result = await loginWithOpenIdSetup('https://actual.example');

    expect(result).toEqual({ url: 'https://identity.example/authorize' });
    expect(createdClients.map(client => client.redirect_uri)).toEqual([
      'https://actual.example/openid/callback',
    ]);
    expect(isValidRedirectUrl('https://actual.example')).toBe(true);
    expect(isValidRedirectUrl('https://old.example')).toBe(false);
  });

  it('ignores a configured server hostname that is not a full URL', async () => {
    setConfiguredServerHostname('actual.example');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    onTestFinished(() => warn.mockRestore());

    const result = await loginWithOpenIdSetup('https://old.example');

    expect(result).toEqual({ url: 'https://identity.example/authorize' });
    expect(createdClients.map(client => client.redirect_uri)).toEqual([
      'https://old.example/openid/callback',
    ]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('ACTUAL_OPENID_SERVER_HOSTNAME'),
    );
  });
});
