import express from 'express';
import {
  errorMiddleware,
  requestLoggerMiddleware,
} from './util/middlewares.js';
import validateSession, { validateAuthHeader } from './util/validate-user.js';
import {
  bootstrap,
  needsBootstrap,
  getLoginMethod,
  listLoginMethods,
  getUserInfo,
  getActiveLoginMethod,
} from './account-db.js';
import { changePassword, loginWithPassword } from './accounts/password.js';
import { isValidRedirectUrl, loginWithOpenIdSetup } from './accounts/openid.js';

let app = express();
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
  res.send({
    status: 'ok',
    data: {
      bootstrapped: !needsBootstrap(),
      loginMethod: getLoginMethod(),
      availableLoginMethods: listLoginMethods(),
      multiuser: getActiveLoginMethod() === 'openid',
    },
  });
});

app.post('/bootstrap', async (req, res) => {
  let boot = await bootstrap(req.body);

  if (boot?.error) {
    res.status(400).send({ status: 'error', reason: boot?.error });
    return;
  }
  res.send({ status: 'ok', data: boot });
});

app.get('/login-methods', (req, res) => {
  let methods = listLoginMethods();
  res.send({ status: 'ok', methods });
});

app.post('/login', async (req, res) => {
  let loginMethod = getLoginMethod(req);
  console.log('Logging in via ' + loginMethod);
  let tokenRes = null;
  switch (loginMethod) {
    case 'header': {
      let headerVal = req.get('x-actual-password') || '';
      const obfuscated =
        '*'.repeat(headerVal.length) || 'No password provided.';
      console.debug('HEADER VALUE: ' + obfuscated);
      if (headerVal == '') {
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
      if (!isValidRedirectUrl(req.body.return_url)) {
        res
          .status(400)
          .send({ status: 'error', reason: 'Invalid redirect URL' });
        return;
      }

      let { error, url } = await loginWithOpenIdSetup(req.body.return_url);
      if (error) {
        res.status(400).send({ status: 'error', reason: error });
        return;
      }
      res.send({ status: 'ok', data: { redirect_url: url } });
      return;
    }

    default:
      tokenRes = loginWithPassword(req.body.password);
      break;
  }
  let { error, token } = tokenRes;

  if (error) {
    res.status(400).send({ status: 'error', reason: error });
    return;
  }

  res.send({ status: 'ok', data: { token } });
});

app.post('/change-password', (req, res) => {
  let session = validateSession(req, res);
  if (!session) return;

  let { error } = changePassword(req.body.password);

  if (error) {
    res.status(400).send({ status: 'error', reason: error });
    return;
  }

  res.send({ status: 'ok', data: {} });
});

app.get('/validate', (req, res) => {
  let session = validateSession(req, res);
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
      },
    });
  }
});
