import express from 'express';
import * as bcrypt from 'bcrypt';
import * as uuid from 'uuid';
import errorMiddleware from './util/error-middleware.js';
import validateUser from './util/validate-user.js';
import getAccountDb from './account-db.js';

let app = express();
app.use(errorMiddleware);

export { app as handlers };

export function init() {
  // eslint-disable-previous-line @typescript-eslint/no-empty-function
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 12);
}

// Non-authenticated endpoints:
//
// /needs-bootstrap
// /boostrap (special endpoint for setting up the instance, cant call again)
// /login

app.get('/needs-bootstrap', (req, res) => {
  let accountDb = getAccountDb();
  let rows = accountDb.all('SELECT * FROM auth');

  res.send({
    status: 'ok',
    data: { bootstrapped: rows.length > 0 },
  });
});

app.post('/bootstrap', (req, res) => {
  let { password } = req.body;
  let accountDb = getAccountDb();

  let rows = accountDb.all('SELECT * FROM auth');
  if (rows.length !== 0) {
    res.status(400).send({
      status: 'error',
      reason: 'already-bootstrapped',
    });
    return;
  }

  if (password == null || password === '') {
    res.status(400).send({ status: 'error', reason: 'invalid-password' });
    return;
  }

  // Hash the password. There's really not a strong need for this
  // since this is a self-hosted instance owned by the user.
  // However, just in case we do it.
  let hashed = hashPassword(password);
  accountDb.mutate('INSERT INTO auth (password) VALUES (?)', [hashed]);

  let token = uuid.v4();
  accountDb.mutate('INSERT INTO sessions (token) VALUES (?)', [token]);

  res.send({ status: 'ok', data: { token } });
});

app.post('/login', (req, res) => {
  let { password } = req.body;
  let accountDb = getAccountDb();

  let row = accountDb.first('SELECT * FROM auth');
  let confirmed = row && bcrypt.compareSync(password, row.password);

  let token = null;
  if (confirmed) {
    // Right now, tokens are permanent and there's just one in the
    // system. In the future this should probably evolve to be a
    // "session" that times out after a long time or something, and
    // maybe each device has a different token
    let row = accountDb.first('SELECT * FROM sessions');
    token = row.token;
  }

  res.send({ status: 'ok', data: { token } });
});

app.post('/change-password', (req, res) => {
  let user = validateUser(req, res);
  if (!user) return;

  let accountDb = getAccountDb();
  let { password } = req.body;

  if (password == null || password === '') {
    res.send({ status: 'error', reason: 'invalid-password' });
    return;
  }

  let hashed = hashPassword(password);
  let token = uuid.v4();
  // Note that this doesn't have a WHERE. This table only ever has 1
  // row (maybe that will change in the future? if this this will not work)
  accountDb.mutate('UPDATE auth SET password = ?', [hashed]);
  accountDb.mutate('UPDATE sessions SET token = ?', [token]);

  res.send({ status: 'ok', data: {} });
});

app.get('/validate', (req, res) => {
  let user = validateUser(req, res);
  if (user) {
    res.send({ status: 'ok', data: { validated: true } });
  }
});

app.use(errorMiddleware);
