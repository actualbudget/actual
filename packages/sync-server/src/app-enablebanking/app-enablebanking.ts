import createDebug from 'debug';
import type { Request, Response } from 'express';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

import { handleError } from '#app-gocardless/util/handle-error';
import { SecretName, secretsService } from '#services/secrets-service';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from '#util/middlewares';

import type {
  EnableBankingSession,
  PsuHeaders,
} from './services/enablebanking-service';
import {
  enableBankingService,
  normalizeAccount,
  normalizeBalance,
  normalizeTransaction,
} from './services/enablebanking-service';
import { EnableBankingError } from './utils/errors';

const debug = createDebug('actual:enable-banking:app');

const app = express();
export { app as handlers };
app.use(requestLoggerMiddleware);
app.use(express.json());

// --- Shared helpers ---

function extractPsuHeaders(req: Request): PsuHeaders {
  const ip = req.ip;
  const ua =
    typeof req.headers['user-agent'] === 'string'
      ? req.headers['user-agent']
      : undefined;

  const headers: PsuHeaders = {};
  if (ip) headers['Psu-Ip-Address'] = ip;
  if (ua) headers['Psu-User-Agent'] = ua;
  return headers;
}

async function buildSessionResult(
  session: EnableBankingSession,
  psuHeaders?: PsuHeaders,
) {
  const accountsWithBalances = await Promise.all(
    session.accounts.map(async account => {
      const normalized = normalizeAccount(account, session.aspsp);

      let balances: ReturnType<typeof normalizeBalance>[] = [];
      try {
        const balanceResult = await enableBankingService.getBalances(
          account.uid,
          psuHeaders,
        );
        balances = balanceResult.balances.map(normalizeBalance);
      } catch (err) {
        debug('Failed to fetch balances for account %s: %s', account.uid, err);
      }

      const preferredBalance =
        balances.find(b => b.balanceType === 'CLAV') ?? balances[0];

      return {
        ...normalized,
        balance: preferredBalance ? preferredBalance.balanceAmount.amount : 0,
        balances,
      };
    }),
  );

  return {
    session_id: session.session_id,
    accounts: accountsWithBalances,
    aspsp: session.aspsp,
  };
}

// Auth callback from bank redirect — must be before validateSessionMiddleware
// since the bank redirects here directly (no auth token available)
app.get('/auth_callback', async (req: Request, res: Response) => {
  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  const state =
    typeof req.query.state === 'string' ? req.query.state : undefined;

  if (!code) {
    res
      .status(400)
      .send(
        '<html><body><p>Authorization failed: missing code.</p></body></html>',
      );
    return;
  }

  if (!state) {
    res
      .status(400)
      .send(
        '<html><body><p>Authorization failed: missing state parameter.</p></body></html>',
      );
    return;
  }

  try {
    const session = await enableBankingService.createSession(code);
    debug(
      'Callback session created: %s with %d accounts',
      session.session_id,
      session.accounts.length,
    );

    const result = await buildSessionResult(session, extractPsuHeaders(req));

    // Always cache the result so retries within TTL can read it
    completedAuths.set(state, result);
    setTimeout(() => completedAuths.delete(state), COMPLETED_AUTH_TTL_MS);

    const pending = pendingAuths.get(state);
    if (pending) {
      pending.resolve(result);
      cleanupPendingAuth(state);
    }

    res.send(
      '<html><body><p>Authorization successful. This window will close.</p>' +
        '<script>setTimeout(function(){window.close()},1000)</script></body></html>',
    );
  } catch (error) {
    const errorResult = {
      error: error instanceof Error ? error.message : 'unknown error',
    };

    completedAuths.set(state, errorResult);
    setTimeout(() => completedAuths.delete(state), COMPLETED_AUTH_TTL_MS);

    const pending = pendingAuths.get(state);
    if (pending) {
      pending.reject(error);
      cleanupPendingAuth(state);
    }

    debug('Callback auth error: %s', error);
    res
      .status(500)
      .send(
        '<html><body><p>Authorization failed. You can close this window and try again.</p></body></html>',
      );
  }
});

app.use(validateSessionMiddleware);

// --- Poll/complete-auth coordination ---

type PendingAuth = {
  id: string;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
};

// NOTE: These in-memory maps make the auth handoff process-local.
// Multi-instance deployments require sticky routing so the same instance
// handles both the callback and client poll for a given state.
const pendingAuths = new Map<string, PendingAuth>();
const completedAuths = new Map<string, unknown>();
let nextWaiterId = 0;

const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const COMPLETED_AUTH_TTL_MS = 30 * 1000; // 30 seconds

function cleanupPendingAuth(state: string, waiterId?: string) {
  const entry = pendingAuths.get(state);
  if (entry && (waiterId == null || entry.id === waiterId)) {
    clearTimeout(entry.timer);
    pendingAuths.delete(state);
  }
}

// --- Routes ---

app.post(
  '/status',
  handleError(async (req: Request, res: Response) => {
    const configured = enableBankingService.isConfigured();

    res.send({
      status: 'ok',
      data: {
        configured,
      },
    });
  }),
);

app.post(
  '/configure',
  handleError(async (req: Request, res: Response) => {
    const { applicationId, secretKey } = req.body || {};

    if (!applicationId || !secretKey) {
      res.send({
        status: 'ok',
        data: {
          error_code: 'INVALID_INPUT',
          error_type: 'Missing applicationId or secretKey',
        },
      });
      return;
    }

    // Validate credentials before persisting to avoid exposing
    // transient bad creds to concurrent requests
    try {
      const appInfo = await enableBankingService.validateCredentials(
        applicationId,
        secretKey,
      );
      debug('Enable Banking application validated: %o', appInfo);
    } catch (error) {
      debug('Enable Banking configuration validation failed: %s', error);
      res.send({
        status: 'ok',
        data: {
          error_code: 'CONFIGURATION_FAILED',
          error_type: error instanceof Error ? error.message : 'unknown error',
        },
      });
      return;
    }

    // Only persist after successful validation
    secretsService.set(SecretName.enablebanking_applicationId, applicationId);
    secretsService.set(SecretName.enablebanking_secretKey, secretKey);

    res.send({
      status: 'ok',
      data: {
        configured: true,
      },
    });
  }),
);

app.post(
  '/aspsps',
  handleError(async (req: Request, res: Response) => {
    const { country } = req.body || {};

    try {
      const aspsps = await enableBankingService.getAspsps(country);

      res.send({
        status: 'ok',
        data: aspsps,
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
  '/start-auth',
  handleError(async (req: Request, res: Response) => {
    const { aspsp, redirectUrl, maxConsentValidity } = req.body || {};

    if (!aspsp || !redirectUrl) {
      res.send({
        status: 'ok',
        data: {
          error_code: 'INVALID_INPUT',
          error_type: 'Missing aspsp or redirectUrl',
        },
      });
      return;
    }

    const state = uuidv4();

    try {
      const authResponse = await enableBankingService.startAuth(
        aspsp,
        redirectUrl,
        state,
        typeof maxConsentValidity === 'number' ? maxConsentValidity : undefined,
      );

      res.send({
        status: 'ok',
        data: {
          url: authResponse.url,
          state,
        },
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
  '/complete-auth',
  handleError(async (req: Request, res: Response) => {
    const { code, state } = req.body || {};

    if (!code) {
      res.send({
        status: 'ok',
        data: {
          error_code: 'INVALID_INPUT',
          error_type: 'Missing code',
        },
      });
      return;
    }

    try {
      const session = await enableBankingService.createSession(code);
      debug(
        'Session created: %s with %d accounts',
        session.session_id,
        session.accounts.length,
      );

      const result = await buildSessionResult(session, extractPsuHeaders(req));

      // Always cache so retries within TTL can read the result
      if (state) {
        completedAuths.set(state, result);
        setTimeout(() => completedAuths.delete(state), COMPLETED_AUTH_TTL_MS);

        const pending = pendingAuths.get(state);
        if (pending) {
          pending.resolve(result);
          cleanupPendingAuth(state);
        }
      }

      res.send({
        status: 'ok',
        data: result,
      });
    } catch (error) {
      const errorResult = {
        error: error instanceof Error ? error.message : 'unknown error',
      };

      if (state) {
        completedAuths.set(state, errorResult);
        setTimeout(() => completedAuths.delete(state), COMPLETED_AUTH_TTL_MS);

        const pending = pendingAuths.get(state);
        if (pending) {
          pending.reject(error);
          cleanupPendingAuth(state);
        }
      }

      res.send({
        status: 'ok',
        data: errorResult,
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
      // If complete-auth already fired before poll-auth, return immediately
      if (completedAuths.has(state)) {
        const result = completedAuths.get(state);
        completedAuths.delete(state);
        res.send({ status: 'ok', data: result });
        return;
      }

      const result = await new Promise((resolve, reject) => {
        // Clean up any existing waiter for this state
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

        // Clean up if client disconnects before resolution
        res.on('close', () => {
          if (!res.writableFinished && !settled) {
            hasClientDisconnected = true;
            cleanupPendingAuth(state, waiterId);
            safeReject(new Error('Client disconnected'));
          }
        });
      });

      if (hasClientDisconnected || res.destroyed || res.writableEnded) {
        return;
      }

      res.send({
        status: 'ok',
        data: result,
      });
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

    const psuHeaders = extractPsuHeaders(req);

    try {
      const dateTo = new Date().toISOString().split('T')[0];
      const dateFrom =
        typeof startDate === 'string'
          ? startDate
          : new Date(startDate).toISOString().split('T')[0];

      // Fetch balances
      const balanceResult = await enableBankingService.getBalances(
        accountId,
        psuHeaders,
      );
      const balances = balanceResult.balances.map(normalizeBalance);

      // Determine starting balance, preferring CLAV balance type
      let startingBalance = 0;
      if (balances.length > 0) {
        const preferredBalance =
          balances.find(b => b.balanceType === 'CLAV') ?? balances[0];
        startingBalance = preferredBalance.balanceAmount.amount;
      }

      // Fetch all paginated transactions
      const rawTransactions = await enableBankingService.getAllTransactions(
        accountId,
        dateFrom,
        dateTo,
        psuHeaders,
      );

      const all: ReturnType<typeof normalizeTransaction>[] = [];
      const booked: ReturnType<typeof normalizeTransaction>[] = [];
      const pending: ReturnType<typeof normalizeTransaction>[] = [];

      for (const tx of rawTransactions) {
        const normalized = normalizeTransaction(tx);
        all.push(normalized);
        if (normalized.booked) {
          booked.push(normalized);
        } else {
          pending.push(normalized);
        }
      }

      res.send({
        status: 'ok',
        data: {
          transactions: {
            all,
            booked,
            pending,
          },
          balances,
          startingBalance,
        },
      });
    } catch (error) {
      debug('Error fetching transactions: %s', error);

      // Return structured error codes so the client can show
      // appropriate UI (e.g. re-auth prompt for expired sessions)
      if (error instanceof EnableBankingError) {
        if (error.error_code === 'INVALID_ACCESS_TOKEN') {
          res.send({
            status: 'ok',
            data: {
              error_type: 'ITEM_ERROR',
              error_code: 'ITEM_LOGIN_REQUIRED',
            },
          });
          return;
        }

        // The bank-sync wire format expects `error_type` to be a broad
        // machine-readable category (matched by AccountSyncCheck's switch),
        // not the human message we now keep on `EnableBankingError.error_type`.
        const wireErrorType =
          error.error_code === 'NOT_FOUND' ? 'INVALID_INPUT' : error.error_code;

        res.send({
          status: 'ok',
          data: {
            error_type: wireErrorType,
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
