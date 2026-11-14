import createDebug from 'debug';
import type { Request, Response } from 'express';
import express from 'express';

import { isAdmin } from '#account-db';
import { handleError } from '#app-gocardless/util/handle-error';
import { SecretName, secretsService } from '#services/secrets-service';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from '#util/middlewares';

import {
  balanceInCents,
  normalizeBalance,
  normalizeTransactions,
  payPalService,
} from './services/paypal-service';
import { PayPalError } from './utils/errors';

const debugSensitive = createDebug('actual-sensitive:paypal');

const debug = createDebug('actual:paypal:app');

const app = express();
export { app as handlers };
app.use(requestLoggerMiddleware);
app.use(express.json());
app.use(validateSessionMiddleware);

function sendError(res: Response, error: unknown) {
  if (error instanceof PayPalError) {
    res.send({
      status: 'ok',
      data: {
        error_type: error.error_type,
        error_code: error.error_code,
      },
    });
    return;
  }

  res.send({
    status: 'ok',
    data: {
      error_type: 'INTERNAL_ERROR',
      error_code: 'INTERNAL_ERROR',
    },
  });
}

app.post(
  '/status',
  handleError(async (_req: Request, res: Response) => {
    res.send({
      status: 'ok',
      data: {
        configured: payPalService.isConfigured(),
      },
    });
  }),
);

app.post(
  '/configure',
  handleError(async (req: Request, res: Response) => {
    if (!isAdmin(res.locals.user_id)) {
      res.status(403).send({
        status: 'error',
        reason: 'forbidden',
        details: 'permission-not-found',
      });
      return;
    }

    const { clientId, clientSecret } = req.body || {};

    if (
      !clientId ||
      !clientSecret ||
      typeof clientId !== 'string' ||
      typeof clientSecret !== 'string'
    ) {
      res.send({
        status: 'ok',
        data: {
          error_code: 'INVALID_INPUT',
          error_type: 'Missing clientId or clientSecret',
        },
      });
      return;
    }

    try {
      await payPalService.validateCredentials(clientId, clientSecret);
    } catch (error) {
      debug('PayPal configuration validation failed');
      debugSensitive('PayPal configuration validation failed: %O', error);
      res.send({
        status: 'ok',
        data: {
          error_code: 'CONFIGURATION_FAILED',
          error_type: error instanceof Error ? error.message : 'unknown error',
        },
      });
      return;
    }

    secretsService.set(SecretName.paypal_clientId, clientId);
    secretsService.set(SecretName.paypal_clientSecret, clientSecret);

    res.send({
      status: 'ok',
      data: {
        configured: true,
      },
    });
  }),
);

app.post(
  '/accounts',
  handleError(async (_req: Request, res: Response) => {
    try {
      const accounts = await payPalService.listAccounts();
      res.send({
        status: 'ok',
        data: { accounts },
      });
    } catch (error) {
      debug('Error listing accounts');
      debugSensitive('Error listing accounts: %O', error);
      sendError(res, error);
    }
  }),
);

app.post(
  '/transactions',
  handleError(async (req: Request, res: Response) => {
    const { accountId, startDate } = req.body || {};

    if (!accountId || !startDate) {
      res.send({
        status: 'ok',
        data: {
          error_code: 'INVALID_INPUT',
          error_type: 'Missing accountId or startDate',
        },
      });
      return;
    }

    try {
      const dateFrom =
        typeof startDate === 'string'
          ? startDate
          : new Date(startDate).toISOString().split('T')[0];

      const { currency, details, balances } =
        await payPalService.getTransactions(accountId, dateFrom);

      const all = details
        .flatMap(normalizeTransactions)
        .sort((a, b) => b.date.localeCompare(a.date));

      res.send({
        status: 'ok',
        data: {
          transactions: {
            all,
            booked: all.filter(tx => tx.booked),
            pending: all.filter(tx => !tx.booked),
          },
          balances: [normalizeBalance(balances, currency)],
          startingBalance: balanceInCents(balances, currency),
        },
      });
    } catch (error) {
      debug('Error fetching transactions');
      debugSensitive('Error fetching transactions: %O', error);
      sendError(res, error);
    }
  }),
);
