import { isAxiosError } from 'axios';
import express from 'express';
import path from 'path';
import { inspect } from 'util';

import { goCardlessService } from './services/gocardless-service.js';
import {
  AccountNotLinkedToRequisition,
  GenericGoCardlessError,
  RateLimitError,
  RequisitionNotLinked,
} from './errors.js';
import { handleError } from './util/handle-error.js';
import { sha256String } from '../util/hash.js';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from '../util/middlewares.js';

const app = express();
app.use(requestLoggerMiddleware);

app.get('/link', function (req, res) {
  res.sendFile('link.html', { root: path.resolve('./src/app-gocardless') });
});

export { app as handlers };
app.use(express.json());
app.use(validateSessionMiddleware);

app.post('/status', async (req, res) => {
  res.send({
    status: 'ok',
    data: {
      configured: goCardlessService.isConfigured(),
    },
  });
});

app.post(
  '/create-web-token',
  handleError(async (req, res) => {
    const { institutionId } = req.body;
    const { origin } = req.headers;

    const { link, requisitionId } = await goCardlessService.createRequisition({
      institutionId,
      host: origin,
    });

    res.send({
      status: 'ok',
      data: {
        link,
        requisitionId,
      },
    });
  }),
);

app.post(
  '/get-accounts',
  handleError(async (req, res) => {
    const { requisitionId } = req.body;

    try {
      const { requisition, accounts } =
        await goCardlessService.getRequisitionWithAccounts(requisitionId);

      res.send({
        status: 'ok',
        data: {
          ...requisition,
          accounts: await Promise.all(
            accounts.map(async (account) =>
              account?.iban
                ? { ...account, iban: await sha256String(account.iban) }
                : account,
            ),
          ),
        },
      });
    } catch (error) {
      if (error instanceof RequisitionNotLinked) {
        res.send({
          status: 'ok',
          requisitionStatus: error.details.requisitionStatus,
        });
      } else {
        throw error;
      }
    }
  }),
);

app.post(
  '/get-banks',
  handleError(async (req, res) => {
    let { country, showDemo = false } = req.body;

    await goCardlessService.setToken();
    const data = await goCardlessService.getInstitutions(country);

    res.send({
      status: 'ok',
      data: showDemo
        ? [
            {
              id: 'SANDBOXFINANCE_SFIN0000',
              name: 'DEMO bank (used for testing bank-sync)',
            },
            ...data,
          ]
        : data,
    });
  }),
);

app.post(
  '/remove-account',
  handleError(async (req, res) => {
    let { requisitionId } = req.body;

    const data = await goCardlessService.deleteRequisition(requisitionId);
    if (data.summary === 'Requisition deleted') {
      res.send({
        status: 'ok',
        data,
      });
    } else {
      res.send({
        status: 'error',
        data: {
          data,
          reason: 'Can not delete requisition',
        },
      });
    }
  }),
);

app.post(
  '/transactions',
  handleError(async (req, res) => {
    const {
      requisitionId,
      startDate,
      endDate,
      accountId,
      includeBalance = true,
    } = req.body;

    try {
      if (includeBalance) {
        const {
          balances,
          institutionId,
          startingBalance,
          transactions: { booked, pending, all },
        } = await goCardlessService.getTransactionsWithBalance(
          requisitionId,
          accountId,
          startDate,
          endDate,
        );

        res.send({
          status: 'ok',
          data: {
            balances,
            institutionId,
            startingBalance,
            transactions: {
              booked,
              pending,
              all,
            },
          },
        });
      } else {
        const {
          institutionId,
          transactions: { booked, pending, all },
        } = await goCardlessService.getNormalizedTransactions(
          requisitionId,
          accountId,
          startDate,
          endDate,
        );

        res.send({
          status: 'ok',
          data: {
            institutionId,
            transactions: {
              booked,
              pending,
              all,
            },
          },
        });
      }
    } catch (error) {
      const headers = error.details?.response?.headers ?? {};

      const rateLimitHeaders = Object.fromEntries(
        Object.entries(headers).filter(([key]) =>
          key.startsWith('http_x_ratelimit'),
        ),
      );

      const sendErrorResponse = (data) =>
        res.send({
          status: 'ok',
          data: { ...data, details: error.details, rateLimitHeaders },
        });

      switch (true) {
        case error instanceof RequisitionNotLinked:
          sendErrorResponse({
            error_type: 'ITEM_ERROR',
            error_code: 'ITEM_LOGIN_REQUIRED',
            status: 'expired',
            reason:
              'Access to account has expired as set in End User Agreement',
          });
          break;
        case error instanceof AccountNotLinkedToRequisition:
          sendErrorResponse({
            error_type: 'INVALID_INPUT',
            error_code: 'INVALID_ACCESS_TOKEN',
            status: 'rejected',
            reason: 'Account not linked with this requisition',
          });
          break;
        case error instanceof RateLimitError:
          sendErrorResponse({
            error_type: 'RATE_LIMIT_EXCEEDED',
            error_code: 'NORDIGEN_ERROR',
            status: 'rejected',
            reason: 'Rate limit exceeded',
          });
          break;
        case error instanceof GenericGoCardlessError:
          console.log('Something went wrong', inspect(error, { depth: null }));
          sendErrorResponse({
            error_type: 'SYNC_ERROR',
            error_code: 'NORDIGEN_ERROR',
          });
          break;
        case isAxiosError(error):
          console.log(
            'Something went wrong',
            inspect(error.response?.data || error, { depth: null }),
          );
          sendErrorResponse({
            error_type: 'SYNC_ERROR',
            error_code: 'NORDIGEN_ERROR',
          });
          break;
        default:
          console.log('Something went wrong', inspect(error, { depth: null }));
          sendErrorResponse({
            error_type: 'UNKNOWN',
            error_code: 'UNKNOWN',
            reason: 'Something went wrong',
          });
          break;
      }
    }
  }),
);
