import { createHash } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

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

  const allowGlobalBankSync = !!getAccountDb().first(
    "SELECT key_id FROM api_key_permissions WHERE key_id = ? AND permission = 'bank-sync-global'",
    [key.id],
  );
  return { user_id: key.user_id, apiKeyFileIds, allowGlobalBankSync };
}

// Bank-sync keys must name an accessible budget; session requests may omit it.
export function validateBankSyncSession({
  allowGlobalCredentials = false,
} = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const session = validateBudgetSession(req, res);
    if (!session) return;
    if (
      'apiKeyFileIds' in session &&
      !session.apiKeyFileIds.includes(req.get('X-Actual-File-Id') ?? '')
    ) {
      res.status(403).send({ status: 'error', reason: 'file-access-denied' });
      return;
    }
    res.locals = {
      ...session,
      allowGlobalBankSync:
        !('apiKeyFileIds' in session) ||
        (session.allowGlobalBankSync && allowGlobalCredentials),
    };
    next();
  };
}

// Setup and connection management continue to require an ordinary session.
export function validateGlobalBankSyncSession(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const session = validateBudgetSession(req, res);
  if (!session) return;
  if ('apiKeyFileIds' in session && !session.allowGlobalBankSync) {
    res.status(403).send({ status: 'error', reason: 'permission-denied' });
    return;
  }
  res.locals = session;
  next();
}
