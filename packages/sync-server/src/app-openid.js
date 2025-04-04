import express from 'express';

import { disableOpenID, enableOpenID, isAdmin } from './account-db.js';
import {
  isValidRedirectUrl,
  loginWithOpenIdFinalize,
} from './accounts/openid.js';
import { checkPassword } from './accounts/password.js';
import * as UserService from './services/user-service.js';
import {
  errorMiddleware,
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from './util/middlewares.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLoggerMiddleware);
export { app as handlers };

app.post('/enable', validateSessionMiddleware, async (req, res) => {
  if (!isAdmin(res.locals.user_id)) {
    res.status(403).send({
      status: 'error',
      reason: 'forbidden',
      details: 'permission-not-found',
    });
    return;
  }

  const { error } = (await enableOpenID(req.body)) || {};

  if (error) {
    res.status(500).send({ status: 'error', reason: error });
    return;
  }
  res.send({ status: 'ok' });
});

app.post('/disable', validateSessionMiddleware, async (req, res) => {
  if (!isAdmin(res.locals.user_id)) {
    res.status(403).send({
      status: 'error',
      reason: 'forbidden',
      details: 'permission-not-found',
    });
    return;
  }

  const { error } = (await disableOpenID(req.body)) || {};

  if (error) {
    res.status(401).send({ status: 'error', reason: error });
    return;
  }
  res.send({ status: 'ok' });
});

app.post('/config', async (req, res) => {
  const { cnt: ownerCount } = UserService.getOwnerCount() || {};

  if (ownerCount > 0) {
    res.status(400).send({ status: 'error', reason: 'already-bootstraped' });
    return;
  }

  if (!checkPassword(req.body.password)) {
    res.status(400).send({ status: 'error', reason: 'invalid-password' });
    return;
  }

  const auth = UserService.getOpenIDConfig();

  if (!auth) {
    res
      .status(500)
      .send({ status: 'error', reason: 'OpenID configuration not found' });
    return;
  }

  try {
    const openIdConfig = JSON.parse(auth.extra_data);
    res.send({ status: 'ok', data: { openId: openIdConfig } });
  } catch (error) {
    res
      .status(500)
      .send({ status: 'error', reason: 'Invalid OpenID configuration' });
  }
});

app.get('/callback', async (req, res) => {
  const { error, url } = await loginWithOpenIdFinalize(req.query);

  if (error) {
    res.status(400).send({ status: 'error', reason: error });
    return;
  }

  if (!isValidRedirectUrl(url)) {
    res.status(400).send({ status: 'error', reason: 'Invalid redirect URL' });
    return;
  }

  res.redirect(url);
});

app.use(errorMiddleware);
