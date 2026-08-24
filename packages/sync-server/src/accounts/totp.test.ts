import { Secret, TOTP } from 'otpauth';

import { getAccountDb } from '#account-db';

import {
  confirmTotpEnrollment,
  disableTotp,
  generateTotpSecret,
  hasPendingTotpEnrollment,
  isTotpEnabled,
  verifyTotp,
} from './totp';

// A fixed instant keeps the generated codes deterministic.
const NOW = 1_700_000_000_000;
const PERIOD_MS = 30 * 1000;

function codeAt(secret: string, timestamp: number) {
  return new TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  }).generate({ timestamp });
}

function enroll() {
  const { secret } = generateTotpSecret();
  return secret;
}

beforeEach(() => {
  getAccountDb().mutate('DELETE FROM auth_totp');
});

afterEach(() => {
  getAccountDb().mutate('DELETE FROM auth_totp');
});

describe('generateTotpSecret', () => {
  it('stores an unconfirmed secret that does not yet gate login', () => {
    const { secret, otpauthUrl } = generateTotpSecret('my.server');

    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(otpauthUrl).toContain('otpauth://totp/');
    expect(otpauthUrl).toContain('issuer=Actual%20Budget');
    expect(isTotpEnabled()).toBe(false);
    expect(hasPendingTotpEnrollment()).toBe(true);
  });

  it('replaces an earlier unconfirmed secret', () => {
    const first = enroll();
    const second = enroll();

    expect(second).not.toEqual(first);
    expect(confirmTotpEnrollment(codeAt(first, NOW), NOW).error).toEqual(
      'invalid-totp-code',
    );
  });

  it('refuses to overwrite a confirmed secret', () => {
    const secret = enroll();
    confirmTotpEnrollment(codeAt(secret, NOW), NOW);

    expect(() => generateTotpSecret()).toThrow('totp-already-enabled');
  });
});

describe('confirmTotpEnrollment', () => {
  it('requires a valid code before enabling', () => {
    const secret = enroll();

    expect(confirmTotpEnrollment('000000', NOW).error).toEqual(
      'invalid-totp-code',
    );
    expect(isTotpEnabled()).toBe(false);

    expect(confirmTotpEnrollment(codeAt(secret, NOW), NOW)).toEqual({});
    expect(isTotpEnabled()).toBe(true);
    expect(hasPendingTotpEnrollment()).toBe(false);
  });

  it('errors when nothing is enrolled', () => {
    expect(confirmTotpEnrollment('123456', NOW).error).toEqual(
      'totp-not-enrolled',
    );
  });
});

describe('verifyTotp', () => {
  function enabledSecret() {
    const secret = enroll();
    // Confirm one step in the past so the current step is still unused.
    confirmTotpEnrollment(codeAt(secret, NOW - PERIOD_MS), NOW - PERIOD_MS);
    return secret;
  }

  it('accepts the current code', () => {
    const secret = enabledSecret();
    expect(verifyTotp(codeAt(secret, NOW), NOW)).toBe(true);
  });

  it('accepts the adjacent steps to tolerate clock skew', () => {
    const secret = enabledSecret();
    expect(verifyTotp(codeAt(secret, NOW + PERIOD_MS), NOW)).toBe(true);
  });

  it('rejects codes outside the window', () => {
    const secret = enabledSecret();
    expect(verifyTotp(codeAt(secret, NOW + 5 * PERIOD_MS), NOW)).toBe(false);
  });

  it('rejects a replayed code', () => {
    const secret = enabledSecret();
    const code = codeAt(secret, NOW);

    expect(verifyTotp(code, NOW)).toBe(true);
    expect(verifyTotp(code, NOW)).toBe(false);
  });

  it('rejects a code from a step at or before the last used one', () => {
    const secret = enabledSecret();

    expect(verifyTotp(codeAt(secret, NOW + PERIOD_MS), NOW)).toBe(true);
    // Going back to the previous step must not work even though it is inside
    // the skew window.
    expect(verifyTotp(codeAt(secret, NOW), NOW)).toBe(false);
  });

  it('rejects malformed input', () => {
    enabledSecret();

    expect(verifyTotp('', NOW)).toBe(false);
    expect(verifyTotp('abcdef', NOW)).toBe(false);
    expect(verifyTotp('12345', NOW)).toBe(false);
  });

  it('returns false when TOTP is not enabled', () => {
    const secret = enroll();
    expect(verifyTotp(codeAt(secret, NOW), NOW)).toBe(false);
  });
});

describe('disableTotp', () => {
  it('clears the secret', () => {
    const secret = enroll();
    confirmTotpEnrollment(codeAt(secret, NOW), NOW);

    disableTotp();

    expect(isTotpEnabled()).toBe(false);
    expect(hasPendingTotpEnrollment()).toBe(false);
  });
});
