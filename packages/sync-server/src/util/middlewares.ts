import createDebug from 'debug';
import type { NextFunction, Request, Response } from 'express';
import * as expressWinston from 'express-winston';
import * as winston from 'winston';

import { validateSession } from './validate-user';

async function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  debugSensitive('Error on %s %s: %O', req.method, req.baseUrl + req.path, err);

  if (res.headersSent) {
    // If you call next() with an error after you have started writing the response
    // (for example, if you encounter an error while streaming the response
    // to the client), the Express default error handler closes
    // the connection and fails the request.

    // So when you add a custom error handler, you must delegate
    // to the default Express error handler, when the headers
    // have already been sent to the client
    // Source: https://expressjs.com/en/guide/error-handling.html
    return next(new Error('Request failed after response headers were sent'));
  }

  console.log(`Error on endpoint %s`, {
    method: req.method,
    path: req.baseUrl + req.path,
    statusCode: 500,
  });
  res.status(500).send({ status: 'error', reason: 'internal-error' });
}

const debugSensitive = createDebug('actual-sensitive:server');

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
  msg: 'HTTP request',
  requestWhitelist: ['method', 'path'],
  responseWhitelist: ['statusCode'],
  requestFilter: (req, key) =>
    key === 'path' ? req.baseUrl + req.path : req.method,
  format: winston.format.combine(
    ...(Object.prototype.hasOwnProperty.call(process.env, 'NO_COLOR')
      ? []
      : [winston.format.colorize()]),
    winston.format.timestamp(),
    winston.format.printf(args => {
      const { timestamp, level, meta } = args;
      const { res, req } = meta as { res: Response; req: Request };

      return `${String(timestamp)} ${String(level)}: ${req.method} ${res.statusCode} ${req.path}`;
    }),
  ),
});

export { validateSessionMiddleware, errorMiddleware, requestLoggerMiddleware };
