import path from 'path';

import express from 'express';

import { sha256String } from '#util/hash';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from '#util/middlewares';

import {
  AccountNotLinkedToRequisition,
  GenericGoCardlessError,
  GoCardlessClientError,
  RateLimitError,
  RequisitionNotLinked,
} from './errors';
import type {
  GoCardlessAccountId,
  GoCardlessInstitutionId,
  GoCardlessRequisitionId,
} from './gocardless-node.types';
import { goCardlessService } from './services/gocardless-service';
import { handleError } from './util/handle-error';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validateOrigin(origin: string | undefined) {
  let url;
  try {
    url = new URL(origin ?? '');
  } catch {
    throw new Error('Invalid Origin header');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Invalid Origin header');
  }
  return url.origin;
}

const SAFE_ID = /^[a-zA-Z0-9_-]+$/;
function sanitizeId<T extends string = string>(id: unknown): T {
  if (typeof id !== 'string' || !SAFE_ID.test(id)) {
    throw new Error(`Invalid GoCardless identifier: ${String(id)}`);
  }
  return id as T;
}

function getRequiredFileIdFromRequest(req: express.Request): string {
  const rawFileId = req.headers['x-actual-file-id'];
  if (typeof rawFileId !== 'string') {
    throw new Error('missing-file-id');
  }
  const fileId = rawFileId.trim();
  if (!fileId) {
    throw new Error('missing-file-id');
  }
  return fileId;
}

const app = express();
app.use(requestLoggerMiddleware);

app.get('/link', function (req, res) {
  res.sendFile('link.html', { root: path.resolve('./src/app-gocardless') });
});

export { app as handlers };
app.use(express.json());
app.use(validateSessionMiddleware);

app.post(
  '/status',
  handleError(async (req, res) => {
    const fileId = getRequiredFileIdFromRequest(req);
    res.send({
      status: 'ok',
      data: {
        configured: goCardlessService.isConfigured({ fileId }),
        source: goCardlessService.getCredentialSource({ fileId }),
      },
    });
  }),
);

app.post(
  '/create-web-token',
  handleError(async (req, res) => {
    const { institutionId: rawInstitutionId } = req.body || {};
    const fileId = getRequiredFileIdFromRequest(req);
    const institutionId = sanitizeId<GoCardlessInstitutionId>(rawInstitutionId);
    const host = validateOrigin(req.headers.origin);

    const { link, requisitionId } = await goCardlessService.createRequisition(
      {
        institutionId,
        host,
      },
      { fileId },
    );

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
    const fileId = getRequiredFileIdFromRequest(req);
    const requisitionId = sanitizeId<GoCardlessRequisitionId>(
      (req.body || {}).requisitionId,
    );

    try {
      const { requisition, accounts } =
        await goCardlessService.getRequisitionWithAccounts(requisitionId, {
          fileId,
        });

      res.send({
        status: 'ok',
        data: {
          ...requisition,
          accounts: await Promise.all(
            accounts.map(async account =>
              account?.iban
                ? { ...account, iban: sha256String(account.iban) }
                : account,
            ),
          ),
        },
      });
    } catch (error) {
      if (error instanceof RequisitionNotLinked) {
        res.send({
          status: 'ok',
          requisitionStatus: isRecord(error.details)
            ? error.details.requisitionStatus
            : undefined,
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
    const fileId = getRequiredFileIdFromRequest(req);
    const { country: rawCountry, showDemo = false } = req.body || {};
    const country = sanitizeId(rawCountry);

    await goCardlessService.setToken({ fileId });
    const data = await goCardlessService.getInstitutions(country, { fileId });

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
    const fileId = getRequiredFileIdFromRequest(req);
    const requisitionId = sanitizeId<GoCardlessRequisitionId>(
      (req.body || {}).requisitionId,
    );

    const data = await goCardlessService.deleteRequisition(requisitionId, {
      fileId,
    });
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
    const fileId = getRequiredFileIdFromRequest(req);
    const {
      requisitionId: rawRequisitionId,
      startDate,
      endDate,
      accountId: rawAccountId,
      includeBalance = true,
    } = req.body || {};
    const requisitionId = sanitizeId<GoCardlessRequisitionId>(rawRequisitionId);
    const accountId = sanitizeId<GoCardlessAccountId>(rawAccountId);

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
          { fileId },
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
          { fileId },
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
      const errorDetails =
        error instanceof RequisitionNotLinked ||
        error instanceof GenericGoCardlessError ||
        error instanceof GoCardlessClientError ||
        error instanceof AccountNotLinkedToRequisition
          ? error.details
          : undefined;

      const responseHeaders =
        isRecord(errorDetails) && isRecord(errorDetails.response)
          ? errorDetails.response.headers
          : undefined;

      const rateLimitHeaders = isRecord(responseHeaders)
        ? Object.fromEntries(
            Object.entries(responseHeaders).filter(([key]) =>
              key.startsWith('x-ratelimit-'),
            ),
          )
        : {};

      const errorMessage =
        error instanceof Error && error.message ? error.message : String(error);

      const sendErrorResponse = (data: Record<string, unknown>) =>
        res.send({
          status: 'ok',
          data: { ...data, details: errorDetails, rateLimitHeaders },
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
          console.log('Something went wrong', errorMessage);
          sendErrorResponse({
            error_type: 'SYNC_ERROR',
            error_code: 'NORDIGEN_ERROR',
          });
          break;
        default:
          console.log('Something went wrong', errorMessage);
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
