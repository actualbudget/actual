import express from 'express';
import { secretsService } from './services/secrets-service.js';
import getAccountDb, { isAdmin } from './account-db.js';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from './util/middlewares.js';

const app = express();

export { app as handlers };
app.use(express.json());
app.use(requestLoggerMiddleware);
app.use(validateSessionMiddleware);

app.post('/', async (req, res) => {
  let method;
  try {
    const result = getAccountDb().first(
      'SELECT method FROM auth WHERE active = 1',
    );
    method = result?.method;
  } catch (error) {
    console.error('Failed to fetch auth method:', error);
    return res.status(500).send({
      status: 'error',
      reason: 'database-error',
      details: 'Failed to validate authentication method',
    });
  }
  const { name, value } = req.body;

  if (method === 'openid') {
    let canSaveSecrets = isAdmin(res.locals.user_id);

    if (!canSaveSecrets) {
      res.status(403).send({
        status: 'error',
        reason: 'not-admin',
        details: 'You have to be admin to set secrets',
      });

      return;
    }
  }

  secretsService.set(name, value);

  res.status(200).send({ status: 'ok' });
});

app.get('/:name', async (req, res) => {
  const name = req.params.name;
  const keyExists = secretsService.exists(name);
  if (keyExists) {
    res.sendStatus(204);
  } else {
    res.status(404).send('key not found');
  }
});
