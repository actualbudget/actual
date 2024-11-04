import validateUser from './validate-user.js';

import * as winston from 'winston';
import * as expressWinston from 'express-winston';

/**
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
async function errorMiddleware(err, req, res, _next) {
  console.log('ERROR', err);
  res.status(500).send({ status: 'error', reason: 'internal-error' });
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const validateUserMiddleware = async (req, res, next) => {
  let user = await validateUser(req, res);
  if (!user) {
    return;
  }
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

export { validateUserMiddleware, errorMiddleware, requestLoggerMiddleware };
