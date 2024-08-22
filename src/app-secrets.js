import express from 'express';
import { secretsService } from './services/secrets-service.js';
import {
  requestLoggerMiddleware,
  validateUserMiddleware,
} from './util/middlewares.js';

const app = express();

export { app as handlers };
app.use(express.json());
app.use(requestLoggerMiddleware);

app.use(validateUserMiddleware);

app.post('/', async (req, res) => {
  const { name, value } = req.body;

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
