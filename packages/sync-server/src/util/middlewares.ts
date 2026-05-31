import type { NextFunction, Request, Response } from 'express';
import * as expressWinston from 'express-winston';
import * as winston from 'winston';

import { validateSession } from './validate-user';

/**
 * Enforce an API token's budget scope against an already-resolved file id.
 *
 * This is the authoritative scope check and must be called from request
 * handlers once the real file id is known (e.g. decoded from the sync
 * protobuf body or read from request headers), since middleware that runs
 * before body parsing cannot reliably see it.
 *
 * Returns `true` when the request is allowed to proceed. When the token is
 * scoped and the file id is outside that scope, it sends a 403 response and
 * returns `false`; callers must stop processing in that case.
 */
const enforceBudgetScope = (res: Response, fileId: unknown): boolean => {
  // Only enforce for API token auth
  if (res.locals.auth_method !== 'api_token') {
    return true;
  }

  const budgetIds = res.locals.budget_ids;

  // If no scopes defined (empty array), token has access to all user's budgets
  if (!budgetIds || budgetIds.length === 0) {
    return true;
  }

  // A scoped token must always target a file id; reject when missing.
  if (typeof fileId !== 'string' || fileId === '') {
    res.status(403).send({
      status: 'error',
      reason: 'token-scope-error',
      details: 'The API token does not have access to this budget',
    });
    return false;
  }

  // Check if the file is in the allowed budget scopes
  if (budgetIds.includes(fileId)) {
    return true;
  }

  // File is not in token's scopes - deny access
  res.status(403).send({
    status: 'error',
    reason: 'token-scope-error',
    details: 'The API token does not have access to this budget',
  });
  return false;
};

/**
 * Middleware that rejects API token authentication on privileged,
 * non-data endpoints. API tokens are data-only and must never reach
 * admin/secrets/bank-sync/auth-management surfaces.
 */
const rejectApiTokenMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (res.locals.auth_method === 'api_token') {
    res.status(403).send({
      status: 'error',
      reason: 'forbidden-auth-method',
      details: 'API tokens cannot access this endpoint',
    });
    return;
  }
  next();
};

async function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) {
    // If you call next() with an error after you have started writing the response
    // (for example, if you encounter an error while streaming the response
    // to the client), the Express default error handler closes
    // the connection and fails the request.

    // So when you add a custom error handler, you must delegate
    // to the default Express error handler, when the headers
    // have already been sent to the client
    // Source: https://expressjs.com/en/guide/error-handling.html
    return next(err);
  }

  console.log(`Error on endpoint %s`, {
    requestUrl: req.url,
    stacktrace: err.stack,
  });
  res.status(500).send({ status: 'error', reason: 'internal-error' });
}

const validateSessionMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const session = await validateSession(req, res);
  if (!session) {
    return;
  }

  res.locals = session;
  next();
};

const requestLoggerMiddleware = expressWinston.logger({
  transports: [new winston.transports.Console()],
  format: winston.format.combine(
    ...(Object.prototype.hasOwnProperty.call(process.env, 'NO_COLOR')
      ? []
      : [winston.format.colorize()]),
    winston.format.timestamp(),
    winston.format.printf(args => {
      const { timestamp, level, meta } = args;
      const { res, req } = meta as { res: Response; req: Request };

      return `${String(timestamp)} ${String(level)}: ${req.method} ${res.statusCode} ${req.url}`;
    }),
  ),
});

export {
  validateSessionMiddleware,
  enforceBudgetScope,
  rejectApiTokenMiddleware,
  errorMiddleware,
  requestLoggerMiddleware,
};
