import { join } from 'node:path';
import openDatabase from './db.js';
import config from './load-config.js';
import * as uuid from 'uuid';
import * as bcrypt from 'bcrypt';

let _accountDb;

export default function getAccountDb() {
  if (_accountDb === undefined) {
    const dbPath = join(config.serverFiles, 'account.sqlite');
    _accountDb = openDatabase(dbPath);
  }

  return _accountDb;
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 12);
}

export function needsBootstrap() {
  let accountDb = getAccountDb();
  let rows = accountDb.all('SELECT * FROM auth');
  return rows.length === 0;
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
    (req.body || { loginMethod: null }).loginMethod
  ) {
    return req.body.loginMethod;
  }
  return config.loginMethod || 'password';
}

export function bootstrap(password) {
  if (password === undefined || password === '') {
    return { error: 'invalid-password' };
  }

  let accountDb = getAccountDb();
  let rows = accountDb.all('SELECT * FROM auth');

  if (rows.length !== 0) {
    return { error: 'already-bootstrapped' };
  }

  // Hash the password. There's really not a strong need for this
  // since this is a self-hosted instance owned by the user.
  // However, just in case we do it.
  let hashed = hashPassword(password);
  accountDb.mutate('INSERT INTO auth (password) VALUES (?)', [hashed]);

  let token = uuid.v4();
  accountDb.mutate('INSERT INTO sessions (token) VALUES (?)', [token]);

  return { token };
}

export function login(password) {
  if (password === undefined || password === '') {
    return { error: 'invalid-password' };
  }

  let accountDb = getAccountDb();
  let row = accountDb.first('SELECT * FROM auth');

  let confirmed = row && bcrypt.compareSync(password, row.password);

  if (!confirmed) {
    return { error: 'invalid-password' };
  }

  // Right now, tokens are permanent and there's just one in the
  // system. In the future this should probably evolve to be a
  // "session" that times out after a long time or something, and
  // maybe each device has a different token
  let sessionRow = accountDb.first('SELECT * FROM sessions');
  return { token: sessionRow.token };
}

export function changePassword(newPassword) {
  if (newPassword === undefined || newPassword === '') {
    return { error: 'invalid-password' };
  }

  let accountDb = getAccountDb();

  let hashed = hashPassword(newPassword);
  let token = uuid.v4();

  // Note that this doesn't have a WHERE. This table only ever has 1
  // row (maybe that will change in the future? if so this will not work)
  accountDb.mutate('UPDATE auth SET password = ?', [hashed]);
  accountDb.mutate('UPDATE sessions SET token = ?', [token]);

  return {};
}

export function getSession(token) {
  let accountDb = getAccountDb();
  return accountDb.first('SELECT * FROM sessions WHERE token = ?', [token]);
}
