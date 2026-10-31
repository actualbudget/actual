import { createHash } from 'node:crypto';

import type { Request, Response } from 'express';

import { getAccountDb } from '#account-db';
import { canAccessActiveFile } from '#services/user-service';

import { validateSession } from './validate-user';

// Only call this on endpoints that explicitly support budget-scoped keys.
// All other endpoints must continue to require an ordinary session.
export function validateBudgetSession(req: Request, res: Response) {
  const token = req.body?.token || req.headers['x-actual-token'];
  if (typeof token !== 'string' || !token.startsWith('actual_')) {
    return validateSession(req, res);
  }

  const key: { id: string; user_id: string } | null =
    /^actual_[A-Za-z0-9_-]{43}$/.test(token)
      ? getAccountDb().first(
          `SELECT api_keys.id, api_keys.user_id
           FROM api_keys JOIN users ON users.id = api_keys.user_id
           WHERE api_keys.key_hash = ? AND users.enabled = 1`,
          [createHash('sha256').update(token).digest('hex')],
        )
      : null;

  if (!key) {
    res.status(401).send({ status: 'error', reason: 'unauthorized' });
    return null;
  }

  // Budget grants restrict access, but do not determine whether the key is valid.
  const budgets: { file_id: string }[] = getAccountDb().all(
    'SELECT file_id FROM api_key_budgets WHERE key_id = ?',
    [key.id],
  );
  const apiKeyFileIds = budgets
    .map(budget => budget.file_id)
    .filter(fileId => canAccessActiveFile(fileId, key.user_id));

  return { user_id: key.user_id, apiKeyFileIds };
}
