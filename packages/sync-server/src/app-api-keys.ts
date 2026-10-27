import { createHash, randomBytes, randomUUID } from 'node:crypto';

import express from 'express';

import { getAccountDb } from './account-db';
import { canAccessActiveFile } from './services/user-service';
import {
  errorMiddleware,
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from './util/middlewares';
import { isValidFileId } from './util/paths';

const app = express();
export { app as handlers };

app.use(express.json());
app.use(requestLoggerMiddleware);
app.use(validateSessionMiddleware);
app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.post('/', (req, res) => {
  const { name, fileId } = req.body ?? {};
  if (
    typeof name !== 'string' ||
    name.trim().length === 0 ||
    name.trim().length > 100 ||
    typeof fileId !== 'string' ||
    !isValidFileId(fileId)
  ) {
    res.status(400).send({ status: 'error', reason: 'invalid-api-key' });
    return;
  }

  const userId: string = res.locals.user_id;
  if (!canAccessActiveFile(fileId, userId)) {
    res.status(403).send({ status: 'error', reason: 'file-access-denied' });
    return;
  }

  const id = randomUUID();
  const key = `actual_${randomBytes(32).toString('base64url')}`;
  // Store only a digest of the randomly generated secret.
  const keyHash = createHash('sha256').update(key).digest('hex');
  const createdAt = Math.floor(Date.now() / 1000);
  getAccountDb().mutate(
    `INSERT INTO api_keys (id, user_id, file_id, name, key_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, fileId, name.trim(), keyHash, createdAt],
  );

  res.status(201).send({
    status: 'ok',
    data: { id, name: name.trim(), fileId, createdAt, key },
  });
});

app.get('/', (_req, res) => {
  const keys = getAccountDb().all(
    `SELECT id, name, file_id AS fileId, created_at AS createdAt
     FROM api_keys WHERE user_id = ? ORDER BY created_at DESC, id`,
    [res.locals.user_id],
  );
  res.send({ status: 'ok', data: keys });
});

app.delete('/:id', (req, res) => {
  const { changes } = getAccountDb().mutate(
    'DELETE FROM api_keys WHERE id = ? AND user_id = ?',
    [req.params.id, res.locals.user_id],
  );
  if (changes === 0) {
    res.status(404).send({ status: 'error', reason: 'api-key-not-found' });
    return;
  }
  res.send({ status: 'ok' });
});

app.use(errorMiddleware);
