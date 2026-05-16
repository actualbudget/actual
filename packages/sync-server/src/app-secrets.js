import express from 'express';

import { getAccountDb, isAdmin } from './account-db';
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

// Both reads and writes against the secrets store touch admin-managed
// integration credentials. When OpenID multi-user mode is active, only
// admins may interact with this store - otherwise non-admin users could
// at minimum enumerate which integrations are configured.
function requireAdminWhenOpenId(res, action) {
  let method;
  try {
    const result = getAccountDb().first(
      'SELECT method FROM auth WHERE active = 1',
    );
    method = result?.method;
  } catch (error) {
    console.error('Failed to fetch auth method:', error);
    res.status(500).send({
      status: 'error',
      reason: 'database-error',
      details: 'Failed to validate authentication method',
    });
    return false;
  }

  if (method === 'openid' && !isAdmin(res.locals.user_id)) {
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
  if (!requireAdminWhenOpenId(res, 'read')) {
    return;
  }

  const name = req.params.name;
  if (!Object.prototype.hasOwnProperty.call(SecretName, name)) {
    res.status(404).send('key not found');
    return;
  }

  const keyExists = secretsService.exists(name);
  if (keyExists) {
    res.sendStatus(204);
  } else {
    res.status(404).send('key not found');
  }
});
