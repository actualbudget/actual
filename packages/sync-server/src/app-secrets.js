import express from 'express';

import { getAccountDb, isAdmin } from './account-db';
import { secretsService } from './services/secrets-service';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from './util/middlewares';

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
  const { name, value, fileId } = req.body || {};

  if (method === 'openid') {
    const canSaveSecrets = isAdmin(res.locals.user_id);

    if (!canSaveSecrets) {
      res.status(403).send({
        status: 'error',
        reason: 'not-admin',
        details: 'You have to be admin to set secrets',
      });

      return;
    }
  }

  const options = fileId ? { fileId } : {};
  secretsService.set(name, value, options);

  res.status(200).send({ status: 'ok' });
});

app.get('/:name', async (req, res) => {
  const name = req.params.name;
  // Support fileId via query param or header
  const fileId = req.query.fileId || req.headers['x-actual-file-id'];
  const options = fileId && typeof fileId === 'string' ? { fileId } : {};
  const keyExists = secretsService.exists(name, options);
  if (keyExists) {
    res.sendStatus(204);
  } else {
    res.status(404).send('key not found');
  }
});
