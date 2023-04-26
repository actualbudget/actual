import express from 'express';
import validateUser from './util/validate-user.js';
import { secretsService } from './services/secrets-service.js';

const app = express();

export { app as handlers };
app.use(express.json());

app.use(async (req, res, next) => {
  let user = await validateUser(req, res);
  if (!user) {
    return;
  }
  next();
});

app.post('/', async (req, res) => {
  const { name, value } = req.body;

  secretsService.set(name, value);

  res.status(200).send('secret set');
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
