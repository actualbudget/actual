import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type { Request } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getAccountDb } from '#account-db';

import {
  getAuthenticationOptions,
  getRegistrationOptions,
  resetWebAuthnCredential,
  verifyAuthentication,
  verifyRegistration,
} from './webauthn';

vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: vi.fn(),
  verifyRegistrationResponse: vi.fn(),
  generateAuthenticationOptions: vi.fn(),
  verifyAuthenticationResponse: vi.fn(),
}));

const FALLBACK_OWNER_ID = 'webauthn-test-owner';

function fakeRequest(host = 'localhost:3000'): Request {
  return {
    hostname: host.split(':')[0],
    protocol: 'http',
    get: (header: string) =>
      header.toLowerCase() === 'host' ? host : undefined,
  } as unknown as Request;
}

function encodeClientData(
  challenge: string,
  type: 'webauthn.create' | 'webauthn.get',
  origin = 'http://localhost:3000',
) {
  return Buffer.from(
    JSON.stringify({ type, challenge, origin, crossOrigin: false }),
  ).toString('base64url');
}

function ensureOwner() {
  const db = getAccountDb();
  const owner = db.first("SELECT id FROM users WHERE user_name = ''");
  if (!owner) {
    db.mutate(
      'INSERT INTO users (id, user_name, display_name, enabled, owner, role) VALUES (?, ?, ?, 1, 1, ?)',
      [FALLBACK_OWNER_ID, '', '', 'ADMIN'],
    );
  }
}

function insertWebauthnCredential(overrides = {}) {
  const credential = {
    credentialID: 'stored-credential-id',
    credentialPublicKey: Buffer.from([1, 2, 3, 4]).toString('base64url'),
    counter: 0,
    transports: ['internal'],
    rpID: 'localhost',
    deviceType: 'singleDevice',
    backedUp: false,
    ...overrides,
  };
  getAccountDb().mutate(
    "INSERT INTO auth (method, display_name, extra_data, active) VALUES ('webauthn', 'Passkey', ?, 1)",
    [JSON.stringify(credential)],
  );
  return credential;
}

beforeEach(() => {
  const db = getAccountDb();
  db.mutate('DELETE FROM auth');
  db.mutate("DELETE FROM sessions WHERE auth_method = 'webauthn'");
  db.mutate('DELETE FROM pending_webauthn_challenges');
  ensureOwner();
  vi.clearAllMocks();
});

afterEach(() => {
  const db = getAccountDb();
  db.mutate('DELETE FROM auth');
  db.mutate("DELETE FROM sessions WHERE auth_method = 'webauthn'");
  db.mutate('DELETE FROM pending_webauthn_challenges');
  db.mutate('DELETE FROM users WHERE id = ?', [FALLBACK_OWNER_ID]);
});

describe('getRegistrationOptions', () => {
  it('generates options and stores the challenge for later verification', async () => {
    vi.mocked(generateRegistrationOptions).mockResolvedValue({
      challenge: 'registration-challenge-1',
      rp: { name: 'Actual Budget', id: 'localhost' },
      user: { id: 'admin', name: 'admin', displayName: 'admin' },
      pubKeyCredParams: [],
    } as never);

    const result = await getRegistrationOptions(fakeRequest());

    expect('error' in result).toBe(false);
    expect(generateRegistrationOptions).toHaveBeenCalledWith(
      expect.objectContaining({ rpID: 'localhost' }),
    );

    const pending = getAccountDb().first(
      'SELECT * FROM pending_webauthn_challenges WHERE challenge = ?',
      ['registration-challenge-1'],
    );
    expect(pending).toBeTruthy();
    expect(pending.type).toBe('registration');
  });
});

describe('verifyRegistration', () => {
  it('rejects a challenge that was never issued', async () => {
    const response = {
      response: {
        clientDataJSON: encodeClientData('unknown', 'webauthn.create'),
      },
    } as never;

    const result = await verifyRegistration(fakeRequest(), response);

    expect(result).toEqual({ error: 'invalid-or-expired-challenge' });
  });

  it('stores the credential and activates the webauthn method on success', async () => {
    getAccountDb().mutate(
      'INSERT INTO pending_webauthn_challenges (challenge, type, expiry_time) VALUES (?, ?, ?)',
      ['registration-challenge-2', 'registration', Date.now() + 60_000],
    );

    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: 'new-credential-id',
          publicKey: Uint8Array.from([9, 9, 9]),
          counter: 0,
          transports: ['internal'],
        },
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
      },
    } as never);

    const response = {
      response: {
        clientDataJSON: encodeClientData(
          'registration-challenge-2',
          'webauthn.create',
        ),
      },
    } as never;

    const result = await verifyRegistration(fakeRequest(), response);

    expect(result).toEqual({});

    const authRow = getAccountDb().first(
      "SELECT * FROM auth WHERE method = 'webauthn'",
    );
    expect(authRow.active).toBe(1);
    const stored = JSON.parse(authRow.extra_data);
    expect(stored.credentialID).toBe('new-credential-id');
    expect(stored.rpID).toBe('localhost');

    // The challenge is single-use.
    const pending = getAccountDb().first(
      'SELECT * FROM pending_webauthn_challenges WHERE challenge = ?',
      ['registration-challenge-2'],
    );
    expect(pending).toBeFalsy();
  });

  it('deactivates any other active method when a passkey is registered', async () => {
    getAccountDb().mutate(
      "INSERT INTO auth (method, display_name, extra_data, active) VALUES ('password', 'Password', 'hash', 1)",
    );
    getAccountDb().mutate(
      'INSERT INTO pending_webauthn_challenges (challenge, type, expiry_time) VALUES (?, ?, ?)',
      ['registration-challenge-3', 'registration', Date.now() + 60_000],
    );
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: 'cred',
          publicKey: Uint8Array.from([1]),
          counter: 0,
          transports: [],
        },
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
      },
    } as never);

    await verifyRegistration(fakeRequest(), {
      response: {
        clientDataJSON: encodeClientData(
          'registration-challenge-3',
          'webauthn.create',
        ),
      },
    } as never);

    const passwordRow = getAccountDb().first(
      "SELECT active FROM auth WHERE method = 'password'",
    );
    expect(passwordRow.active).toBe(0);
  });

  it('returns verification-failed when the library rejects the response', async () => {
    getAccountDb().mutate(
      'INSERT INTO pending_webauthn_challenges (challenge, type, expiry_time) VALUES (?, ?, ?)',
      ['registration-challenge-4', 'registration', Date.now() + 60_000],
    );
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: false,
    } as never);

    const result = await verifyRegistration(fakeRequest(), {
      response: {
        clientDataJSON: encodeClientData(
          'registration-challenge-4',
          'webauthn.create',
        ),
      },
    } as never);

    expect(result).toEqual({ error: 'verification-failed' });
  });
});

describe('getAuthenticationOptions', () => {
  it('errors when no credential has been registered', async () => {
    const result = await getAuthenticationOptions(fakeRequest());
    expect(result).toEqual({ error: 'webauthn-not-configured' });
  });

  it('generates options scoped to the stored credential', async () => {
    insertWebauthnCredential();
    vi.mocked(generateAuthenticationOptions).mockResolvedValue({
      challenge: 'authentication-challenge-1',
      rpId: 'localhost',
    } as never);

    const result = await getAuthenticationOptions(fakeRequest());

    expect('error' in result).toBe(false);
    expect(generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        rpID: 'localhost',
        allowCredentials: [
          { id: 'stored-credential-id', transports: ['internal'] },
        ],
      }),
    );
  });
});

describe('verifyAuthentication', () => {
  it('errors when no credential has been registered', async () => {
    const result = await verifyAuthentication(fakeRequest(), {
      response: { clientDataJSON: encodeClientData('x', 'webauthn.get') },
    } as never);

    expect(result).toEqual({ error: 'webauthn-not-configured' });
  });

  it('rejects when the request rpID does not match the stored credential', async () => {
    insertWebauthnCredential({ rpID: 'someotherhost' });

    const result = await verifyAuthentication(fakeRequest(), {
      response: { clientDataJSON: encodeClientData('x', 'webauthn.get') },
    } as never);

    expect(result).toEqual({ error: 'rp-id-mismatch' });
  });

  it('rejects an expired or unknown challenge', async () => {
    insertWebauthnCredential();

    const result = await verifyAuthentication(fakeRequest(), {
      response: { clientDataJSON: encodeClientData('unknown', 'webauthn.get') },
    } as never);

    expect(result).toEqual({ error: 'invalid-or-expired-challenge' });
  });

  it('issues a token, updates the counter, and reuses the implicit admin user on success', async () => {
    insertWebauthnCredential({ counter: 5 });
    getAccountDb().mutate(
      'INSERT INTO pending_webauthn_challenges (challenge, type, expiry_time) VALUES (?, ?, ?)',
      ['authentication-challenge-2', 'authentication', Date.now() + 60_000],
    );
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 6 },
    } as never);

    const result = await verifyAuthentication(fakeRequest(), {
      response: {
        clientDataJSON: encodeClientData(
          'authentication-challenge-2',
          'webauthn.get',
        ),
      },
    } as never);

    expect(result).toHaveProperty('token');

    const authRow = getAccountDb().first(
      "SELECT extra_data FROM auth WHERE method = 'webauthn'",
    );
    expect(JSON.parse(authRow.extra_data).counter).toBe(6);

    const session = getAccountDb().first(
      "SELECT * FROM sessions WHERE auth_method = 'webauthn'",
    );
    expect(session).toBeTruthy();
    expect(session.token).toBe((result as { token: string }).token);
  });

  it('reuses the same session token on a second login', async () => {
    insertWebauthnCredential();

    async function login(challenge: string) {
      getAccountDb().mutate(
        'INSERT INTO pending_webauthn_challenges (challenge, type, expiry_time) VALUES (?, ?, ?)',
        [challenge, 'authentication', Date.now() + 60_000],
      );
      vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 1 },
      } as never);
      return verifyAuthentication(fakeRequest(), {
        response: {
          clientDataJSON: encodeClientData(challenge, 'webauthn.get'),
        },
      } as never);
    }

    const first = await login('authentication-challenge-3');
    const second = await login('authentication-challenge-4');

    expect((first as { token: string }).token).toBe(
      (second as { token: string }).token,
    );
  });
});

describe('resetWebAuthnCredential', () => {
  it('clears the stored credential and any webauthn sessions', () => {
    insertWebauthnCredential();
    getAccountDb().mutate(
      'INSERT INTO sessions (token, expires_at, user_id, auth_method) VALUES (?, ?, ?, ?)',
      ['some-token', -1, FALLBACK_OWNER_ID, 'webauthn'],
    );

    resetWebAuthnCredential();

    expect(
      getAccountDb().first("SELECT * FROM auth WHERE method = 'webauthn'"),
    ).toBeFalsy();
    expect(
      getAccountDb().first(
        "SELECT * FROM sessions WHERE auth_method = 'webauthn'",
      ),
    ).toBeFalsy();
  });
});
