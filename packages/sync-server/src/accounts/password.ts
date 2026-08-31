import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { clearExpiredSessions, getAccountDb } from '#account-db';
import { config } from '#load-config';
import { TOKEN_EXPIRATION_NEVER } from '#util/validate-user';

// https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#argon2id
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 47104,
  timeCost: 1,
  parallelism: 1,
};

export function isValidPassword(password: unknown): boolean {
  return password != null && password !== '';
}

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  password: string,
  hash: unknown,
): Promise<boolean> {
  if (typeof hash !== 'string') return false;

  if (hash.startsWith('$argon2')) {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

function isLegacyHash(hash: unknown): boolean {
  return typeof hash === 'string' && !hash.startsWith('$argon2');
}

export function setPasswordHash(hashed: string): void {
  const accountDb = getAccountDb();
  accountDb.transaction(() => {
    accountDb.mutate('DELETE FROM auth WHERE method = ?', ['password']);
    accountDb.mutate('UPDATE auth SET active = 0');
    accountDb.mutate(
      "INSERT INTO auth (method, display_name, extra_data, active) VALUES ('password', 'Password', ?, 1)",
      [hashed],
    );
  });
}

export async function bootstrapPassword(
  password: string,
): Promise<{ error?: string }> {
  if (!isValidPassword(password)) {
    return { error: 'invalid-password' };
  }

  const hashed = await hashPassword(password);
  setPasswordHash(hashed);

  return {};
}

export async function loginWithPassword(
  password: string,
): Promise<{ error: string } | { token: string }> {
  if (!isValidPassword(password)) {
    return { error: 'invalid-password' };
  }

  const accountDb = getAccountDb();
  const { extra_data: passwordHash }: { extra_data?: string | null } =
    accountDb.first('SELECT extra_data FROM auth WHERE method = ?', [
      'password',
    ]) || {};

  if (!passwordHash) {
    return { error: 'invalid-password' };
  }

  const confirmed = await verifyPassword(password, passwordHash);

  if (!confirmed) {
    return { error: 'invalid-password' };
  }

  if (isLegacyHash(passwordHash)) {
    const rehashed = await hashPassword(password);
    accountDb.mutate(
      "UPDATE auth SET extra_data = ? WHERE method = 'password' AND extra_data = ?",
      [rehashed, passwordHash],
    );
  }

  const sessionRow: { token: string } | null = accountDb.first(
    'SELECT * FROM sessions WHERE auth_method = ?',
    ['password'],
  );

  const token = sessionRow ? sessionRow.token : uuidv4();

  const { totalOfUsers }: { totalOfUsers: number } = accountDb.first(
    'SELECT count(*) as totalOfUsers FROM users',
  );
  let userId: string | null = null;
  if (totalOfUsers === 0) {
    userId = uuidv4();
    accountDb.mutate(
      'INSERT INTO users (id, user_name, display_name, enabled, owner, role) VALUES (?, ?, ?, 1, 1, ?)',
      [userId, '', '', 'ADMIN'],
    );
  } else {
    const { id: userIdFromDb }: { id: string | null } = accountDb.first(
      'SELECT id FROM users WHERE user_name = ?',
      [''],
    );

    userId = userIdFromDb;

    if (!userId) {
      return { error: 'user-not-found' };
    }
  }

  const tokenExpiration: string | number = config.get('token_expiration');

  let expiration: number = TOKEN_EXPIRATION_NEVER;
  if (
    tokenExpiration !== 'never' &&
    tokenExpiration !== 'openid-provider' &&
    typeof tokenExpiration === 'number'
  ) {
    expiration = Math.floor(Date.now() / 1000) + tokenExpiration * 60;
  }

  if (!sessionRow) {
    accountDb.mutate(
      'INSERT INTO sessions (token, expires_at, user_id, auth_method) VALUES (?, ?, ?, ?)',
      [token, expiration, userId, 'password'],
    );
  } else {
    accountDb.mutate(
      'UPDATE sessions SET user_id = ?, expires_at = ? WHERE token = ?',
      [userId, expiration, token],
    );
  }

  clearExpiredSessions();

  return { token };
}

export async function changePassword(
  newPassword: string,
): Promise<{ error?: string }> {
  const accountDb = getAccountDb();

  if (!isValidPassword(newPassword)) {
    return { error: 'invalid-password' };
  }

  const hashed = await hashPassword(newPassword);
  const result = accountDb.mutate(
    "UPDATE auth SET extra_data = ? WHERE method = 'password'",
    [hashed],
  );
  if (result.changes === 0) {
    return { error: 'no-password-method' };
  }
  return {};
}

export async function checkPassword(password: string): Promise<boolean> {
  if (!isValidPassword(password)) {
    return false;
  }

  const accountDb = getAccountDb();
  const { extra_data: passwordHash }: { extra_data?: string | null } =
    accountDb.first('SELECT extra_data FROM auth WHERE method = ?', [
      'password',
    ]) || {};

  if (!passwordHash) {
    return false;
  }

  return await verifyPassword(password, passwordHash);
}
