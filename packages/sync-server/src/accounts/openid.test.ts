import { getAccountDb } from '#account-db';
import type { ConfigParameter } from '#accounts/openid';

import { isValidRedirectUrl } from './openid';

function insertOpenIdAuth(extraData: Partial<ConfigParameter>) {
  getAccountDb().mutate(
    'INSERT INTO auth (method, display_name, extra_data, active) VALUES (?, ?, ?, ?)',
    ['openid', 'OpenID', JSON.stringify(extraData), 1],
  );
}

describe('isValidRedirectUrl', () => {
  afterEach(() => {
    getAccountDb().mutate('DELETE FROM auth');
  });

  it('returns false when OpenID is not configured', () => {
    expect(isValidRedirectUrl('http://localhost:5006/callback')).toBe(false);
  });

  describe('with server_hostname set to http://localhost:5006', () => {
    beforeEach(() => {
      insertOpenIdAuth({ server_hostname: 'http://localhost:5006' });
    });

    it('accepts a redirect to the same host and port', () => {
      expect(isValidRedirectUrl('http://localhost:5006/openid-cb')).toBe(true);
    });

    it('rejects a redirect to the same host on a different port', () => {
      // Regression test for open redirect (CWE-601): a different port on
      // localhost must not be treated as a valid redirect target.
      expect(isValidRedirectUrl('http://localhost:9999/steal')).toBe(false);
      expect(isValidRedirectUrl('http://localhost:1337/attacker')).toBe(false);
    });

    it('rejects a redirect to an external host', () => {
      expect(isValidRedirectUrl('http://evil.attacker.com/steal')).toBe(false);
    });

    it('rejects an invalid URL', () => {
      expect(isValidRedirectUrl('not a url')).toBe(false);
      expect(isValidRedirectUrl(undefined)).toBe(false);
    });
  });

  describe('with server_hostname set to https://budget.example.com', () => {
    beforeEach(() => {
      insertOpenIdAuth({ server_hostname: 'https://budget.example.com' });
    });

    it('accepts a redirect that omits the implicit https port', () => {
      expect(isValidRedirectUrl('https://budget.example.com/openid-cb')).toBe(
        true,
      );
      expect(
        isValidRedirectUrl('https://budget.example.com:443/openid-cb'),
      ).toBe(true);
    });

    it('rejects a redirect to the same host on a different port', () => {
      expect(isValidRedirectUrl('https://budget.example.com:8443/steal')).toBe(
        false,
      );
    });

    it('rejects a redirect to a different host', () => {
      expect(isValidRedirectUrl('https://localhost:5006/steal')).toBe(false);
    });
  });
});
