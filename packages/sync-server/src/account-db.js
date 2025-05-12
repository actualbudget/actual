import { join, resolve } from 'node:path';

import * as bcrypt from 'bcrypt';

import { bootstrapOpenId } from './accounts/openid.js';
import { bootstrapPassword, loginWithPassword } from './accounts/password.js';
import { openDatabase } from './db.js';
import { config } from './load-config.js';

let _accountDb;

export function getAccountDb() {
  if (_accountDb === undefined) {
    const dbPath = join(resolve(config.get('serverFiles')), 'account.sqlite');
    _accountDb = openDatabase(dbPath);
  }

  return _accountDb;
}

export function needsBootstrap() {
  const accountDb = getAccountDb();
  const rows = accountDb.all('SELECT * FROM auth');
  return rows.length === 0;
}

export function listLoginMethods() {
  const accountDb = getAccountDb();
  const rows = accountDb.all('SELECT method, display_name, active FROM auth');
  return rows
    .filter(f =>
      rows.length > 1 && config.get('enforceOpenId')
        ? f.method === 'openid'
        : true,
    )
    .map(r => ({
      method: r.method,
      active: r.active,
      displayName: r.display_name,
    }));
}

export function getActiveLoginMethod() {
  const accountDb = getAccountDb();
  const { method } =
    accountDb.first('SELECT method FROM auth WHERE active = 1') || {};
  return method;
}

/*
 * Get the Login Method in the following order
 * req (the frontend can say which method in the case it wants to resort to forcing password auth)
 * config options
 * fall back to using password
 */
export function getLoginMethod(req) {
  if (
    typeof req !== 'undefined' &&
    (req.body || { loginMethod: null }).loginMethod &&
    config.get('allowedLoginMethods').includes(req.body.loginMethod)
  ) {
    return req.body.loginMethod;
  }

  //BY-PASS ANY OTHER CONFIGURATION TO ENSURE HEADER AUTH
  if (
    config.get('loginMethod') === 'header' &&
    config.get('allowedLoginMethods').includes('header')
  ) {
    return config.get('loginMethod');
  }

  const activeMethod = getActiveLoginMethod();
  return activeMethod || config.get('loginMethod');
}

export async function bootstrap(loginSettings, forced = false) {
  if (!loginSettings) {
    return { error: 'invalid-login-settings' };
  }
  const passEnabled = 'password' in loginSettings;
  const openIdEnabled = 'openId' in loginSettings;

  const accountDb = getAccountDb();
  accountDb.mutate('BEGIN TRANSACTION');
  try {
    const { countOfOwner } =
      accountDb.first(
        `SELECT count(*) as countOfOwner
   FROM users
   WHERE users.user_name <> '' and users.owner = 1`,
      ) || {};

    if (!forced && (!openIdEnabled || countOfOwner > 0)) {
      if (!needsBootstrap()) {
        accountDb.mutate('ROLLBACK');
        return { error: 'already-bootstrapped' };
      }
    }

    if (!passEnabled && !openIdEnabled) {
      accountDb.mutate('ROLLBACK');
      return { error: 'no-auth-method-selected' };
    }

    if (passEnabled && openIdEnabled && !forced) {
      accountDb.mutate('ROLLBACK');
      return { error: 'max-one-method-allowed' };
    }

    if (passEnabled) {
      const { error } = bootstrapPassword(loginSettings.password);
      if (error) {
        accountDb.mutate('ROLLBACK');
        return { error };
      }
    }

    if (openIdEnabled && forced) {
      const { error } = await bootstrapOpenId(loginSettings.openId);
      if (error) {
        accountDb.mutate('ROLLBACK');
        return { error };
      }
    }

    accountDb.mutate('COMMIT');
    return passEnabled ? loginWithPassword(loginSettings.password) : {};
  } catch (error) {
    accountDb.mutate('ROLLBACK');
    throw error;
  }
}

export function isAdmin(userId) {
  return hasPermission(userId, 'ADMIN');
}

export function hasPermission(userId, permission) {
  return getUserPermission(userId) === permission;
}

export async function enableOpenID(loginSettings) {
  if (!loginSettings || !loginSettings.openId) {
    return { error: 'invalid-login-settings' };
  }

  const { error } = (await bootstrapOpenId(loginSettings.openId)) || {};
  if (error) {
    return { error };
  }

  getAccountDb().mutate('DELETE FROM sessions');
}

export async function disableOpenID(loginSettings) {
  if (!loginSettings || !loginSettings.password) {
    return { error: 'invalid-login-settings' };
  }

  const accountDb = getAccountDb();
  const { extra_data: passwordHash } =
    accountDb.first('SELECT extra_data FROM auth WHERE method = ?', [
      'password',
    ]) || {};

  if (!passwordHash) {
    return { error: 'invalid-password' };
  }

  if (!loginSettings?.password) {
    return { error: 'invalid-password' };
  }

  if (passwordHash) {
    const confirmed = bcrypt.compareSync(loginSettings.password, passwordHash);

    if (!confirmed) {
      return { error: 'invalid-password' };
    }
  }

  const { error } = (await bootstrapPassword(loginSettings.password)) || {};
  if (error) {
    return { error };
  }

  try {
    accountDb.transaction(() => {
      accountDb.mutate('DELETE FROM sessions');
      accountDb.mutate(
        `DELETE FROM user_access
                              WHERE user_access.user_id IN (
                                  SELECT users.id
                                  FROM users
                                  WHERE users.user_name <> ?
                              );`,
        [''],
      );
      accountDb.mutate('DELETE FROM users WHERE user_name <> ?', ['']);
      accountDb.mutate('DELETE FROM auth WHERE method = ?', ['openid']);
    });
  } catch (err) {
    console.error('Error cleaning up openid information:', err);
    return { error: 'database-error' };
  }
}

export function getSession(token) {
  const accountDb = getAccountDb();
  return accountDb.first('SELECT * FROM sessions WHERE token = ?', [token]);
}

export function getUserInfo(userId) {
  const accountDb = getAccountDb();
  return accountDb.first('SELECT * FROM users WHERE id = ?', [userId]);
}

export function getUserPermission(userId) {
  const accountDb = getAccountDb();
  const { role } = accountDb.first(
    `SELECT role FROM users
          WHERE users.id = ?`,
    [userId],
  ) || { role: '' };

  return role;
}

export function clearExpiredSessions() {
  const clearThreshold = Math.floor(Date.now() / 1000) - 3600;

  const deletedSessions = getAccountDb().mutate(
    'DELETE FROM sessions WHERE expires_at <> -1 and expires_at < ?',
    [clearThreshold],
  ).changes;

  console.log(`Deleted ${deletedSessions} old sessions`);
}
