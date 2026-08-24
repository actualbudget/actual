import { Secret, TOTP } from 'otpauth';

import { getAccountDb } from '#account-db';

// Standard TOTP parameters (RFC 6238). SHA1/6 digits/30s is what virtually
// every authenticator app assumes when scanning a QR code.
const TOTP_ALGORITHM = 'SHA1';
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;
const TOTP_ISSUER = 'Actual Budget';

// Accept the previous and next step to tolerate clock skew between the server
// and the user's device.
const TOTP_WINDOW = 1;

// A code is only ever accepted once. Anything at or below the last accepted
// step is a replay.
type TotpRow = {
  secret: string;
  confirmed: number;
  last_used_step: number | null;
};

function getTotpRow(): TotpRow | null {
  return (
    (getAccountDb().first(
      'SELECT secret, confirmed, last_used_step FROM auth_totp WHERE id = 1',
    ) as TotpRow | undefined) ?? null
  );
}

function buildTotp(secret: string, label: string): TOTP {
  return new TOTP({
    issuer: TOTP_ISSUER,
    label,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret: Secret.fromBase32(secret),
  });
}

function currentStep(timestamp: number): number {
  return Math.floor(timestamp / 1000 / TOTP_PERIOD);
}

/** Whether TOTP is enabled and confirmed, i.e. required at login. */
export function isTotpEnabled(): boolean {
  const row = getTotpRow();
  return row !== null && row.confirmed === 1;
}

/** Whether a secret has been generated but not yet proven to work. */
export function hasPendingTotpEnrollment(): boolean {
  const row = getTotpRow();
  return row !== null && row.confirmed === 0;
}

/**
 * Create a new secret for enrollment. The secret is stored unconfirmed and has
 * no effect on login until `confirmTotpEnrollment` succeeds, so an abandoned
 * enrollment can never lock anyone out.
 */
export function generateTotpSecret(label: string = TOTP_ISSUER): {
  secret: string;
  otpauthUrl: string;
} {
  if (isTotpEnabled()) {
    throw new Error('totp-already-enabled');
  }

  const secret = new Secret({ size: 20 }).base32;
  const accountDb = getAccountDb();

  // Replaces any earlier unconfirmed secret: restarting enrollment should
  // invalidate the QR code the user walked away from.
  accountDb.mutate(
    `INSERT INTO auth_totp (id, secret, confirmed, last_used_step, created_at)
     VALUES (1, ?, 0, NULL, ?)
     ON CONFLICT (id) DO UPDATE SET
       secret = excluded.secret,
       confirmed = 0,
       last_used_step = NULL,
       created_at = excluded.created_at`,
    [secret, Date.now()],
  );

  return { secret, otpauthUrl: buildTotp(secret, label).toString() };
}

function validateCode(
  row: TotpRow,
  code: string,
  timestamp: number,
): { valid: boolean; step?: number } {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
    return { valid: false };
  }

  const totp = buildTotp(row.secret, TOTP_ISSUER);
  const delta = totp.validate({
    token: code.trim(),
    timestamp,
    window: TOTP_WINDOW,
  });

  if (delta === null) {
    return { valid: false };
  }

  const step = currentStep(timestamp) + delta;

  if (row.last_used_step !== null && step <= row.last_used_step) {
    return { valid: false };
  }

  return { valid: true, step };
}

function markStepUsed(step: number): void {
  getAccountDb().mutate(
    'UPDATE auth_totp SET last_used_step = ? WHERE id = 1',
    [step],
  );
}

/**
 * Finish enrollment by proving the authenticator app produces valid codes.
 * Only after this does TOTP start being required at login.
 */
export function confirmTotpEnrollment(
  code: string,
  timestamp: number = Date.now(),
): { error?: string } {
  const row = getTotpRow();

  if (!row) {
    return { error: 'totp-not-enrolled' };
  }
  if (row.confirmed === 1) {
    return { error: 'totp-already-enabled' };
  }

  const { valid, step } = validateCode(row, code, timestamp);
  if (!valid) {
    return { error: 'invalid-totp-code' };
  }

  getAccountDb().mutate(
    'UPDATE auth_totp SET confirmed = 1, last_used_step = ? WHERE id = 1',
    [step!],
  );

  return {};
}

/** Verify a code at login. Consumes the step so the code cannot be reused. */
export function verifyTotp(
  code: string,
  timestamp: number = Date.now(),
): boolean {
  const row = getTotpRow();

  if (!row || row.confirmed !== 1) {
    return false;
  }

  const { valid, step } = validateCode(row, code, timestamp);
  if (!valid) {
    return false;
  }

  markStepUsed(step!);
  return true;
}

export function disableTotp(): void {
  getAccountDb().mutate('DELETE FROM auth_totp WHERE id = 1');
}
