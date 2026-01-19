import express from 'express';

import {
  bootstrap,
  getActiveLoginMethod,
  getLoginMethod,
  getServerPrefs,
  getUserInfo,
  isAdmin,
  listLoginMethods,
  needsBootstrap,
  setServerPrefs,
} from './account-db';
import { isValidRedirectUrl, loginWithOpenIdSetup } from './accounts/openid';
import { changePassword, loginWithPassword } from './accounts/password';
import { errorMiddleware, requestLoggerMiddleware } from './util/middlewares';
import { validateAuthHeader, validateSession } from './util/validate-user';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(errorMiddleware);
app.use(requestLoggerMiddleware);
export { app as handlers };

// Non-authenticated endpoints:
//
// /needs-bootstrap
// /boostrap (special endpoint for setting up the instance, cant call again)
// /login

app.get('/needs-bootstrap', (req, res) => {
  const availableLoginMethods = listLoginMethods();
  res.send({
    status: 'ok',
    data: {
      bootstrapped: !needsBootstrap(),
      loginMethod:
        availableLoginMethods.length === 1
          ? availableLoginMethods[0].method
          : getLoginMethod(),
      availableLoginMethods,
      multiuser: getActiveLoginMethod() === 'openid',
    },
  });
});

app.post('/bootstrap', async (req, res) => {
  const boot = await bootstrap(req.body);

  if (boot?.error) {
    res.status(400).send({ status: 'error', reason: boot?.error });
    return;
  }
  res.send({ status: 'ok', data: boot });
});

app.get('/login-methods', (req, res) => {
  const methods = listLoginMethods();
  res.send({ status: 'ok', methods });
});

app.post('/login', async (req, res) => {
  const loginMethod = getLoginMethod(req);
  console.log('Logging in via ' + loginMethod);
  let tokenRes = null;
  switch (loginMethod) {
    case 'header': {
      const headerVal = req.get('x-actual-password') || '';
      const obfuscated =
        '*'.repeat(headerVal.length) || 'No password provided.';
      console.debug('HEADER VALUE: ' + obfuscated);
      if (headerVal === '') {
        res.send({ status: 'error', reason: 'invalid-header' });
        return;
      } else {
        if (validateAuthHeader(req)) {
          tokenRes = loginWithPassword(headerVal);
        } else {
          res.send({ status: 'error', reason: 'proxy-not-trusted' });
          return;
        }
      }
      break;
    }
    case 'openid': {
      if (!isValidRedirectUrl(req.body.returnUrl)) {
        res
          .status(400)
          .send({ status: 'error', reason: 'Invalid redirect URL' });
        return;
      }

      const { error, url } = await loginWithOpenIdSetup(
        req.body.returnUrl,
        req.body.password,
      );
      if (error) {
        res.status(400).send({ status: 'error', reason: error });
        return;
      }
      res.send({ status: 'ok', data: { returnUrl: url } });
      return;
    }

    default:
      tokenRes = loginWithPassword(req.body.password);
      break;
  }
  const { error, token } = tokenRes;

  if (error) {
    res.status(400).send({ status: 'error', reason: error });
    return;
  }

  res.send({ status: 'ok', data: { token } });
});

app.post('/change-password', (req, res) => {
  const session = validateSession(req, res);
  if (!session) return;

  const { error } = changePassword(req.body.password);

  if (error) {
    res.status(400).send({ status: 'error', reason: error });
    return;
  }

  res.send({ status: 'ok', data: {} });
});

app.post('/server-prefs', (req, res) => {
  const session = validateSession(req, res);
  if (!session) return;

  if (!isAdmin(session.user_id)) {
    res.status(403).send({
      status: 'error',
      reason: 'forbidden',
      details: 'permission-not-found',
    });
    return;
  }

  const { prefs } = req.body || {};

  if (!prefs || typeof prefs !== 'object') {
    res.status(400).send({ status: 'error', reason: 'invalid-prefs' });
    return;
  }

  setServerPrefs(prefs);

  res.send({ status: 'ok', data: {} });
});

app.get('/validate', (req, res) => {
  const session = validateSession(req, res);
  if (session) {
    const user = getUserInfo(session.user_id);
    if (!user) {
      res.status(400).send({ status: 'error', reason: 'User not found' });
      return;
    }

    res.send({
      status: 'ok',
      data: {
        validated: true,
        userName: user?.user_name,
        permission: user?.role,
        userId: session?.user_id,
        displayName: user?.display_name,
        loginMethod: session?.auth_method,
        prefs: getServerPrefs(),
      },
    });
  }
});
