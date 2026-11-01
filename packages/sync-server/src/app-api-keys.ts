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
  const { name: rawName, fileIds } = req.body ?? {};
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  if (
    !name ||
    name.length > 100 ||
    !Array.isArray(fileIds) ||
    fileIds.length === 0 ||
    !fileIds.every(id => typeof id === 'string' && isValidFileId(id)) ||
    new Set(fileIds).size !== fileIds.length
  ) {
    res.status(400).send({ status: 'error', reason: 'invalid-api-key' });
    return;
  }

  const userId: string = res.locals.user_id;
  if (!fileIds.every(id => canAccessActiveFile(id, userId))) {
    res.status(403).send({ status: 'error', reason: 'file-access-denied' });
    return;
  }

  const id = randomUUID();
  const key = `actual_${randomBytes(32).toString('base64url')}`;
  // Store only a digest of the randomly generated secret.
  const keyHash = createHash('sha256').update(key).digest('hex');
  const createdAt = Math.floor(Date.now() / 1000);
  const db = getAccountDb();
  db.transaction(() => {
    db.mutate(
      `INSERT INTO api_keys (id, user_id, name, key_hash, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, userId, name, keyHash, createdAt],
    );
    for (const fileId of fileIds) {
      db.mutate('INSERT INTO api_key_budgets (key_id, file_id) VALUES (?, ?)', [
        id,
        fileId,
      ]);
    }
  });

  res.status(201).send({
    status: 'ok',
    data: { id, name, fileIds, createdAt, key },
  });
});

app.get('/', (_req, res) => {
  const keys: {
    id: string;
    name: string;
    createdAt: number;
    fileIds: string;
  }[] = getAccountDb().all(
    `SELECT id, name, created_at AS createdAt,
       (SELECT json_group_array(file_id) FROM api_key_budgets WHERE key_id = api_keys.id) AS fileIds
     FROM api_keys WHERE user_id = ? ORDER BY created_at DESC, id`,
    [res.locals.user_id],
  );
  res.send({
    status: 'ok',
    data: keys.map(({ fileIds, ...key }) => ({
      ...key,
      fileIds: JSON.parse(fileIds),
    })),
  });
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
