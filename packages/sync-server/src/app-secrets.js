import express from 'express';

import { getActiveLoginMethod, isAdmin } from './account-db';
import { SecretName, secretsService } from './services/secrets-service';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from './util/middlewares';

const app = express();

export { app as handlers };
app.use(express.json());
app.use(requestLoggerMiddleware);
app.use(validateSessionMiddleware);

// Gate reads and writes alike: in OpenID mode, non-admins could otherwise
// enumerate which admin-managed integrations are configured.
function requireAdminWhenOpenId(res, action) {
  if (getActiveLoginMethod() === 'openid' && !isAdmin(res.locals.user_id)) {
    res.status(403).send({
      status: 'error',
      reason: 'not-admin',
      details: `You have to be admin to ${action} secrets`,
    });
    return false;
  }

  return true;
}

app.post('/', async (req, res) => {
  if (!requireAdminWhenOpenId(res, 'set')) {
    return;
  }

  const { name, value } = req.body || {};

  secretsService.set(name, value);

  res.status(200).send({ status: 'ok' });
});

app.get('/:name', async (req, res) => {
  const name = req.params.name;
  if (!(name in SecretName)) {
    res.status(404).send('key not found');
    return;
  }

  if (!requireAdminWhenOpenId(res, 'read')) {
    return;
  }

  if (secretsService.exists(name)) {
    res.sendStatus(204);
  } else {
    res.status(404).send('key not found');
  }
});
