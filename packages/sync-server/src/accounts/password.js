import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { clearExpiredSessions, getAccountDb } from '../account-db.js';
import { config } from '../load-config.js';
import { TOKEN_EXPIRATION_NEVER } from '../util/validate-user.js';

function isValidPassword(password) {
  return password != null && password !== '';
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 12);
}

export function bootstrapPassword(password) {
  if (!isValidPassword(password)) {
    return { error: 'invalid-password' };
  }

  const hashed = hashPassword(password);
  const accountDb = getAccountDb();
  accountDb.transaction(() => {
    accountDb.mutate('DELETE FROM auth WHERE method = ?', ['password']);
    accountDb.mutate('UPDATE auth SET active = 0');
    accountDb.mutate(
      "INSERT INTO auth (method, display_name, extra_data, active) VALUES ('password', 'Password', ?, 1)",
      [hashed],
    );
  });

  return {};
}

export function loginWithPassword(password) {
  if (!isValidPassword(password)) {
    return { error: 'invalid-password' };
  }

  const accountDb = getAccountDb();
  const { extra_data: passwordHash } =
    accountDb.first('SELECT extra_data FROM auth WHERE method = ?', [
      'password',
    ]) || {};

  if (!passwordHash) {
    return { error: 'invalid-password' };
  }

  const confirmed = bcrypt.compareSync(password, passwordHash);

  if (!confirmed) {
    return { error: 'invalid-password' };
  }

  const sessionRow = accountDb.first(
    'SELECT * FROM sessions WHERE auth_method = ?',
    ['password'],
  );

  const token = sessionRow ? sessionRow.token : uuidv4();

  const { totalOfUsers } = accountDb.first(
    'SELECT count(*) as totalOfUsers FROM users',
  );
  let userId = null;
  if (totalOfUsers === 0) {
    userId = uuidv4();
    accountDb.mutate(
      'INSERT INTO users (id, user_name, display_name, enabled, owner, role) VALUES (?, ?, ?, 1, 1, ?)',
      [userId, '', '', 'ADMIN'],
    );
  } else {
    const { id: userIdFromDb } = accountDb.first(
      'SELECT id FROM users WHERE user_name = ?',
      [''],
    );

    userId = userIdFromDb;

    if (!userId) {
      return { error: 'user-not-found' };
    }
  }

  let expiration = TOKEN_EXPIRATION_NEVER;
  if (
    config.get('token_expiration') !== 'never' &&
    config.get('token_expiration') !== 'openid-provider' &&
    typeof config.get('token_expiration') === 'number'
  ) {
    expiration =
      Math.floor(Date.now() / 1000) + config.get('token_expiration') * 60;
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

export function changePassword(newPassword) {
  const accountDb = getAccountDb();

  if (!isValidPassword(newPassword)) {
    return { error: 'invalid-password' };
  }

  const hashed = hashPassword(newPassword);
  accountDb.mutate("UPDATE auth SET extra_data = ? WHERE method = 'password'", [
    hashed,
  ]);
  return {};
}

export function checkPassword(password) {
  if (!isValidPassword(password)) {
    return false;
  }

  const accountDb = getAccountDb();
  const { extra_data: passwordHash } =
    accountDb.first('SELECT extra_data FROM auth WHERE method = ?', [
      'password',
    ]) || {};

  if (!passwordHash) {
    return false;
  }

  const confirmed = bcrypt.compareSync(password, passwordHash);

  if (!confirmed) {
    return false;
  }

  return true;
}
