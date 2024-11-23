import validateSession from './validate-user.js';

import * as winston from 'winston';
import * as expressWinston from 'express-winston';

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
  console.log(`Error on endpoint ${req.url}`, err.message, err.stack);
  res.status(500).send({ status: 'error', reason: 'internal-error' });
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const validateSessionMiddleware = async (req, res, next) => {
  let session = await validateSession(req, res);
  if (!session) {
    return;
  }

  res.locals = session;
  next();
};

const requestLoggerMiddleware = expressWinston.logger({
  transports: [new winston.transports.Console()],
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.printf((args) => {
      const { timestamp, level, meta } = args;
      const { res, req } = meta;

      return `${timestamp} ${level}: ${req.method} ${res.statusCode} ${req.url}`;
    }),
  ),
});

export { validateSessionMiddleware, errorMiddleware, requestLoggerMiddleware };
