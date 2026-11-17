import { format } from 'node:util';

import createDebug from 'debug';
import express from 'express';
import request from 'supertest';
import * as winston from 'winston';

import { errorMiddleware, requestLoggerMiddleware } from './middlewares';

it.each(['/openid/callback', '/enablebanking/auth_callback'])(
  'excludes secrets from serialized request and error logs for %s',
  async path => {
    const records: string[] = [];
    const transport = vi
      .spyOn(winston.transports.Console.prototype, 'log')
      .mockImplementation((info, callback) => {
        records.push(JSON.stringify(info));
        if (typeof info === 'object' && info !== null) {
          records.push(String(Reflect.get(info, Symbol.for('message'))));
        }
        if (typeof callback === 'function') callback();
      });
    const consoleLog = vi
      .spyOn(console, 'log')
      .mockImplementation((...args) => {
        records.push(JSON.stringify(args));
      });
    const secrets = {
      code: 'secret-authorization-code',
      state: 'secret-client-state',
      token: 'secret-session-token',
      verifier: 'secret-exchange-verifier',
    };
    const app = express();
    app.use(requestLoggerMiddleware);
    app.get(path, (req, res) => {
      if (req.query.fail) {
        throw new Error(JSON.stringify(secrets));
      }
      res.status(200).send(secrets);
    });
    app.use(errorMiddleware);
    try {
      await request(app).get(path).query(secrets).expect(200);
      await request(app)
        .get(path)
        .query({ ...secrets, fail: 'yes' })
        .expect(500);
      const logged = records.join('\n');
      for (const secret of Object.values(secrets)) {
        expect(logged).not.toContain(secret);
      }
      expect(logged).toContain(path);
      expect(logged).toContain('GET');
      expect(logged).toContain('200');
      expect(logged).toContain('500');
    } finally {
      transport.mockRestore();
      consoleLog.mockRestore();
    }
  },
);

it.each(['', 'actual:*', 'actual-sensitive:server'])(
  'retains full server errors only with sensitive debugging (%s)',
  async namespaces => {
    const previous = createDebug.disable();
    createDebug.enable(namespaces);
    const debugLog = vi
      .spyOn(createDebug, 'log')
      .mockImplementation(() => undefined);
    const ordinaryLog = vi
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
    const secret = 'private-error-detail';
    const original = new Error(
      `Provider rejected ${secret}: redirect mismatch`,
    );
    let forwarded: Error | undefined;
    const app = express();
    app.get('/stream', (_req, res, next) => {
      res.write('started');
      next(original);
    });
    app.use(errorMiddleware);
    app.use(
      (
        error: Error,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        forwarded = error;
        res.end();
      },
    );
    try {
      await request(app).get('/stream').expect(200);
      expect(forwarded?.message).not.toContain(secret);
      expect(JSON.stringify(ordinaryLog.mock.calls)).not.toContain(secret);
      const output = debugLog.mock.calls
        .map(args => format(...args))
        .join('\n');
      expect(output.includes(secret)).toBe(
        namespaces === 'actual-sensitive:server',
      );
      if (namespaces === 'actual-sensitive:server') {
        expect(output).toContain('redirect mismatch');
        expect(output).toContain('middlewares.test.ts:');
      }
    } finally {
      debugLog.mockRestore();
      ordinaryLog.mockRestore();
      createDebug.enable(previous);
    }
  },
);
