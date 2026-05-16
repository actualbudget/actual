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

// In OpenID mode the secrets store is admin-managed; non-admins must be
// blocked from both reads and writes, otherwise they can enumerate which
// integrations are configured.
function canManageSecrets(userId) {
  return getActiveLoginMethod() !== 'openid' || isAdmin(userId);
}

app.post('/', async (req, res) => {
  if (!canManageSecrets(res.locals.user_id)) {
    res.status(403).send({
      status: 'error',
      reason: 'not-admin',
      details: 'You have to be admin to set secrets',
    });
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

  if (!canManageSecrets(res.locals.user_id)) {
    res.status(403).send({
      status: 'error',
      reason: 'not-admin',
      details: 'You have to be admin to read secrets',
    });
    return;
  }

  if (secretsService.exists(name)) {
    res.sendStatus(204);
  } else {
    res.status(404).send('key not found');
  }
});
