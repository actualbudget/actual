import { v4 as uuidv4 } from 'uuid';

import { getAccountDb } from '#account-db';

// Mirrors the pending_openid_requests lifecycle: short-lived rows, expired
// entries swept on each insert.
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

// A challenge token is single-use in practice; capping attempts stops a stolen
// token from being used to brute-force the 6-digit code.
const MAX_ATTEMPTS = 5;

type ChallengeRow = {
  token: string;
  user_id: string;
  expiry_time: number;
  attempts: number;
};

/**
 * Record that the first factor succeeded, and hand back a token the client
 * must present along with a TOTP code. No session exists until that happens.
 */
export function createMfaChallenge(userId: string): string {
  const accountDb = getAccountDb();
  const now = Date.now();
  const token = uuidv4();

  accountDb.mutate('DELETE FROM pending_mfa_challenges WHERE expiry_time < ?', [
    now,
  ]);
  accountDb.mutate(
    'INSERT INTO pending_mfa_challenges (token, user_id, expiry_time, attempts) VALUES (?, ?, ?, 0)',
    [token, userId, now + CHALLENGE_TTL_MS],
  );

  return token;
}

export function getMfaChallenge(token: string): ChallengeRow | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  return (
    (getAccountDb().first(
      'SELECT token, user_id, expiry_time, attempts FROM pending_mfa_challenges WHERE token = ? AND expiry_time > ?',
      [token, Date.now()],
    ) as ChallengeRow | undefined) ?? null
  );
}

/**
 * Count a failed code entry. Returns whether the challenge is still usable —
 * once the cap is hit the challenge is destroyed and the user starts over.
 */
export function recordFailedMfaAttempt(token: string): boolean {
  const accountDb = getAccountDb();
  const challenge = getMfaChallenge(token);

  if (!challenge) {
    return false;
  }

  const attempts = challenge.attempts + 1;

  if (attempts >= MAX_ATTEMPTS) {
    deleteMfaChallenge(token);
    return false;
  }

  accountDb.mutate(
    'UPDATE pending_mfa_challenges SET attempts = ? WHERE token = ?',
    [attempts, token],
  );

  return true;
}

export function deleteMfaChallenge(token: string): void {
  getAccountDb().mutate('DELETE FROM pending_mfa_challenges WHERE token = ?', [
    token,
  ]);
}
