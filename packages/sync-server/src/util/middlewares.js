import * as expressWinston from 'express-winston';
import * as winston from 'winston';

import { validateSession } from './validate-user';

/**
 * Middleware to enforce API token budget scopes.
 * If authenticated via API token with budget scopes, only allows access to those budgets.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const validateBudgetScopeMiddleware = (req, res, next) => {
  // Only enforce for API token auth
  if (res.locals.auth_method !== 'api_token') {
    return next();
  }

  const budgetIds = res.locals.budget_ids;

  // If no scopes defined (empty array), token has access to all user's budgets
  if (!budgetIds || budgetIds.length === 0) {
    return next();
  }

  // Get file ID from various sources
  const fileId =
    req.headers['x-actual-file-id'] ||
    req.body?.fileId ||
    req.query?.fileId ||
    req.params?.fileId;

  // If no file ID in request, allow (some endpoints don't require a file)
  if (!fileId) {
    return next();
  }

  // Check if the file is in the allowed budget scopes
  if (budgetIds.includes(fileId)) {
    return next();
  }

  // File is not in token's scopes - deny access
  res.status(403).send({
    status: 'error',
    reason: 'token-scope-error',
    details: 'The API token does not have access to this budget',
  });
};

/**
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function errorMiddleware(err, req, res, next) {
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

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const validateSessionMiddleware = async (req, res, next) => {
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
      const { res, req } = meta;

      return `${timestamp} ${level}: ${req.method} ${res.statusCode} ${req.url}`;
    }),
  ),
});

export {
  validateSessionMiddleware,
  validateBudgetScopeMiddleware,
  errorMiddleware,
  requestLoggerMiddleware,
};
