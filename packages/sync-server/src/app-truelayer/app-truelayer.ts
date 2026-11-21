import createDebug from 'debug';
import type { Request, Response } from 'express';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

import { isAdmin } from '#account-db';
import { handleError } from '#app-gocardless/util/handle-error';
import type { BankSyncTransaction } from '#app-truelayer/types/bank-sync-transaction';
import type { PendingAuth } from '#app-truelayer/types/pending-auth';
import type { TrueLayerTransaction } from '#app-truelayer/types/truelayer-transaction';
import { SecretName, secretsService } from '#services/secrets-service';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from '#util/middlewares';
import { isBlockedIp } from '#util/ssrf';

import {
  isImportableTransaction,
  normalizeBalance,
  normalizeTransaction,
  startingBalanceInCents,
  trueLayerService,
} from './services/truelayer-service';
import { TrueLayerError } from './utils/errors';

const debugSensitive = createDebug('actual-sensitive:truelayer');

const debug = createDebug('actual:truelayer:app');

const app = express();
export { app as handlers };
app.use(requestLoggerMiddleware);
app.use(express.json());

const POLL_TIMEOUT_MS = 5 * 60 * 1000;
const COMPLETED_AUTH_TTL_MS = 30 * 1000;
const AUTH_REQUEST_TTL_MS = 15 * 60 * 1000;

const authRedirects = new Map<string, string>();
const pendingAuths = new Map<string, PendingAuth>();
const completedAuths = new Map<string, unknown>();
let nextWaiterId = 0;

function cleanupPendingAuth(state: string, waiterId?: string) {
  const entry = pendingAuths.get(state);
  if (entry && (waiterId == null || entry.id === waiterId)) {
    clearTimeout(entry.timer);
    pendingAuths.delete(state);
  }
}

function settleAuth(state: string, result: unknown, error?: unknown) {
  completedAuths.set(state, result);
  setTimeout(() => completedAuths.delete(state), COMPLETED_AUTH_TTL_MS);

  const pending = pendingAuths.get(state);
  if (pending) {
    if (error) {
      pending.reject(error);
    } else {
      pending.resolve(result);
    }
    cleanupPendingAuth(state);
  }
}

function psuIp(req: Request): string | undefined {
  const ip = req.ip;
  if (!ip || isBlockedIp(ip)) {
    debug('Skipping PSU IP because it is local/private');
    return undefined;
  }
  return ip;
}

function sendPage(res: Response, status: number, message: string) {
  const close =
    status === 200
      ? '<script>setTimeout(function(){window.close()},1000)</script>'
      : '';
  res
    .status(status)
    .send(`<html><body><p>${message}</p>${close}</body></html>`);
}

function importable(
  transactions: TrueLayerTransaction[],
  booked: boolean,
): BankSyncTransaction[] {
  const result: BankSyncTransaction[] = [];
  for (const tx of transactions) {
    const normalized = normalizeTransaction(tx, booked);
    if (!isImportableTransaction(normalized)) {
      debugSensitive(
        'Skipping unimportable transaction id=%s date=%s',
        normalized.transactionId,
        normalized.date,
      );
      continue;
    }
    result.push(normalized);
  }
  return result;
}

app.get('/auth_callback', async (req: Request, res: Response) => {
  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  const state =
    typeof req.query.state === 'string' ? req.query.state : undefined;
  const providerError =
    typeof req.query.error === 'string' ? req.query.error : undefined;

  if (!state) {
    sendPage(res, 400, 'Authorization failed: missing state parameter.');
    return;
  }

  const redirectUrl = authRedirects.get(state);
  authRedirects.delete(state);

  if (!redirectUrl) {
    sendPage(res, 400, 'Authorization failed: unknown or expired request.');
    return;
  }

  if (providerError || !code) {
    const message = providerError || 'missing code';
    settleAuth(state, { error: message }, new Error(message));
    sendPage(
      res,
      400,
      'Authorization was cancelled or failed. You can close this window.',
    );
    return;
  }

  try {
    const connectionId = await trueLayerService.createConnection(
      code,
      redirectUrl,
    );
    const accounts = await trueLayerService.listAccounts(
      connectionId,
      psuIp(req),
    );
    debug('Callback connection created with %d accounts', accounts.length);
    settleAuth(state, { accounts });
    sendPage(res, 200, 'Authorization successful. This window will close.');
  } catch (error) {
    debug('Callback authentication failed');
    debugSensitive('Callback authentication failed: %O', error);
    settleAuth(
      state,
      { error: error instanceof Error ? error.message : 'unknown error' },
      error,
    );
    sendPage(
      res,
      500,
      'Authorization failed. You can close this window and try again.',
    );
  }
});

app.use(validateSessionMiddleware);

app.post(
  '/status',
  handleError(async (_req: Request, res: Response) => {
    res.send({
      status: 'ok',
      data: {
        configured: trueLayerService.isConfigured(),
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

    if (!clientId || !clientSecret) {
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
      await trueLayerService.validateCredentials(clientId, clientSecret);
    } catch (error) {
      debug('TrueLayer configuration validation failed');
      debugSensitive('TrueLayer configuration validation failed: %O', error);
      res.send({
        status: 'ok',
        data: {
          error_code: 'CONFIGURATION_FAILED',
          error_type: error instanceof Error ? error.message : 'unknown error',
        },
      });
      return;
    }

    secretsService.set(SecretName.truelayer_clientId, clientId);
    secretsService.set(SecretName.truelayer_clientSecret, clientSecret);

    res.send({
      status: 'ok',
      data: {
        configured: true,
      },
    });
  }),
);

app.post(
  '/start-auth',
  handleError(async (req: Request, res: Response) => {
    const { redirectUrl } = req.body || {};

    if (!redirectUrl || typeof redirectUrl !== 'string') {
      res.send({
        status: 'ok',
        data: {
          error_code: 'INVALID_INPUT',
          error_type: 'Missing redirectUrl',
        },
      });
      return;
    }

    try {
      const state = uuidv4();
      const url = trueLayerService.buildAuthUrl(redirectUrl, state);
      authRedirects.set(state, redirectUrl);
      setTimeout(() => authRedirects.delete(state), AUTH_REQUEST_TTL_MS);

      res.send({
        status: 'ok',
        data: { url, state },
      });
    } catch (error) {
      res.send({
        status: 'ok',
        data: {
          error: error instanceof Error ? error.message : 'unknown error',
        },
      });
    }
  }),
);

app.post(
  '/poll-auth',
  handleError(async (req: Request, res: Response) => {
    const { state } = req.body || {};

    if (!state) {
      res.send({
        status: 'ok',
        data: {
          error_code: 'INVALID_INPUT',
          error_type: 'Missing state',
        },
      });
      return;
    }

    const waiterId = String(++nextWaiterId);
    let hasClientDisconnected = false;

    try {
      if (completedAuths.has(state)) {
        const result = completedAuths.get(state);
        completedAuths.delete(state);
        res.send({ status: 'ok', data: result });
        return;
      }

      const result = await new Promise((resolve, reject) => {
        const existing = pendingAuths.get(state);
        if (existing) {
          clearTimeout(existing.timer);
          existing.reject(new Error('Poll superseded'));
        }

        let settled = false;
        const safeResolve = (value: unknown) => {
          if (settled) return;
          settled = true;
          resolve(value);
        };
        const safeReject = (reason: unknown) => {
          if (settled) return;
          settled = true;
          reject(reason);
        };

        const timer = setTimeout(() => {
          cleanupPendingAuth(state, waiterId);
          safeReject(new Error('Polling timed out'));
        }, POLL_TIMEOUT_MS);

        pendingAuths.set(state, {
          id: waiterId,
          resolve: safeResolve,
          reject: safeReject,
          timer,
        });

        res.on('close', () => {
          if (!res.writableFinished && !settled) {
            hasClientDisconnected = true;
            cleanupPendingAuth(state, waiterId);
            safeReject(new Error('Client disconnected'));
          }
        });
      });

      completedAuths.delete(state);

      if (hasClientDisconnected || res.destroyed || res.writableEnded) {
        return;
      }

      res.send({ status: 'ok', data: result });
    } catch (error) {
      cleanupPendingAuth(state, waiterId);
      if (hasClientDisconnected || res.destroyed || res.writableEnded) {
        return;
      }
      res.send({
        status: 'ok',
        data: {
          error: error instanceof Error ? error.message : 'unknown error',
        },
      });
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

      const { kind, booked, pending, balance } =
        await trueLayerService.getTransactions(accountId, dateFrom, psuIp(req));

      const bookedNormalized = importable(booked, true);
      const pendingNormalized = importable(pending, false);

      const all = [...pendingNormalized, ...bookedNormalized].sort((a, b) =>
        b.date.localeCompare(a.date),
      );
      const balances = balance ? [normalizeBalance(balance, kind)] : [];

      res.send({
        status: 'ok',
        data: {
          transactions: {
            all,
            booked: bookedNormalized,
            pending: pendingNormalized,
          },
          balances,
          startingBalance: startingBalanceInCents(
            booked,
            pendingNormalized,
            balance,
            kind,
          ),
        },
      });
    } catch (error) {
      debug('Error fetching transactions');
      debugSensitive('Error fetching transactions: %O', error);

      if (error instanceof TrueLayerError) {
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
  }),
);
