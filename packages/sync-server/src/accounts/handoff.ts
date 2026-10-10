import { createHash, randomBytes } from 'node:crypto';

import { clearExpiredSessions, getAccountDb } from '#account-db';

export function validClientChallenge(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function createHandoff(
  userId: string,
  challenge: string,
  sessionExpiration: number,
) {
  const db = getAccountDb();
  const code = randomBytes(32).toString('base64url');
  db.mutate('DELETE FROM openid_handoffs WHERE expires_at <= ?', [Date.now()]);
  db.mutate(
    'INSERT INTO openid_handoffs (code, client_challenge, user_id, expires_at, session_expires_at) VALUES (?, ?, ?, ?, ?)',
    [code, challenge, userId, Date.now() + 60_000, sessionExpiration],
  );
  return code;
}

export function exchangeHandoff(
  code: unknown,
  verifier: unknown,
): { token?: string; error?: string } {
  if (
    !validClientChallenge(code) ||
    typeof verifier !== 'string' ||
    !/^[A-Za-z0-9_-]{43,128}$/.test(verifier)
  ) {
    return { error: 'invalid-handoff' };
  }
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const db = getAccountDb();
  let result: { token?: string; error?: string } = { error: 'invalid-handoff' };
  db.transaction(() => {
    const handoff = db.first(
      `SELECT h.user_id, h.session_expires_at FROM openid_handoffs h
       JOIN users u ON u.id = h.user_id
       WHERE h.code = ? AND h.client_challenge = ? AND h.expires_at > ? AND u.enabled = 1
       AND EXISTS (SELECT 1 FROM auth WHERE method = 'openid' AND active = 1)`,
      [code, challenge, Date.now()],
    );
    if (
      !handoff ||
      (handoff.session_expires_at !== -1 &&
        handoff.session_expires_at <= Date.now() / 1000)
    ) {
      return;
    }
    db.mutate('DELETE FROM openid_handoffs WHERE code = ?', [code]);
    const token = randomBytes(32).toString('base64url');
    db.mutate(
      'INSERT INTO sessions (token, expires_at, user_id, auth_method) VALUES (?, ?, ?, ?)',
      [token, handoff.session_expires_at, handoff.user_id, 'openid'],
    );
    clearExpiredSessions();
    result = { token };
  });
  return result;
}
