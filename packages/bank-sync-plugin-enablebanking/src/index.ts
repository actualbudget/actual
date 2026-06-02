import {
  attachPluginMiddleware,
  saveSecret,
} from '@actual-app/plugins-core-sync-server';
import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import './manifest';
import {
  enableBankingService,
  normalizeAccount,
  normalizeBalance,
  normalizeTransaction,
  type EnableBankingSession,
  type PsuHeaders,
} from './services/enablebanking-service';
import { EnableBankingError } from './utils/errors';

const app = express();
app.use(express.json());
attachPluginMiddleware(app);

type PendingAuth = {
  id: string;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
};

const pendingAuths = new Map<string, PendingAuth>();
const completedAuths = new Map<string, unknown>();
const stateFileIds = new Map<string, string>();
let nextWaiterId = 0;

const POLL_TIMEOUT_MS = 5 * 60 * 1000;
const COMPLETED_AUTH_TTL_MS = 30 * 1000;

function getFileIdFromRequest(req: Request): string {
  const rawFileId =
    req.body?.fileId || req.query?.fileId || req.headers['x-actual-file-id'];
  if (typeof rawFileId !== 'string' || rawFileId.trim() === '') {
    throw new Error('missing-file-id');
  }
  return rawFileId.trim();
}

function getSecretOptions(req: Request) {
  return { fileId: getFileIdFromRequest(req), req };
}

function extractPsuHeaders(req: Request): PsuHeaders {
  const ip = req.ip;
  const ua =
    typeof req.headers['user-agent'] === 'string'
      ? req.headers['user-agent']
      : undefined;

  return {
    ...(ip ? { 'Psu-Ip-Address': ip } : {}),
    ...(ua ? { 'Psu-User-Agent': ua } : {}),
  };
}

function cleanupPendingAuth(state: string, waiterId?: string) {
  const entry = pendingAuths.get(state);
  if (entry && (waiterId == null || entry.id === waiterId)) {
    clearTimeout(entry.timer);
    pendingAuths.delete(state);
  }
}

function sendOk(res: Response, data: unknown) {
  res.send({ status: 'ok', data });
}

function sendError(res: Response, error: unknown) {
  res.send({
    status: 'ok',
    data: {
      error: error instanceof Error ? error.message : 'unknown error',
    },
  });
}

async function buildSessionResult(
  session: EnableBankingSession,
  options: { fileId: string; req: Request },
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
          options,
        );
        balances = balanceResult.balances.map(normalizeBalance);
      } catch {
        balances = [];
      }

      const preferredBalance =
        balances.find(b => b.balanceType === 'CLAV') ?? balances[0];

      return {
        ...normalized,
        bank_id: account.uid,
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

app.get('/status', async (req: Request, res: Response) => {
  try {
    sendOk(res, {
      configured: await enableBankingService.isConfigured(
        getSecretOptions(req),
      ),
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.post('/status', async (req: Request, res: Response) => {
  try {
    sendOk(res, {
      configured: await enableBankingService.isConfigured(
        getSecretOptions(req),
      ),
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.post('/configure', async (req: Request, res: Response) => {
  try {
    const { applicationId, secretKey } = req.body || {};

    if (!applicationId || !secretKey) {
      sendOk(res, {
        error_code: 'INVALID_INPUT',
        error_type: 'Missing applicationId or secretKey',
      });
      return;
    }

    try {
      await enableBankingService.validateCredentials(applicationId, secretKey);
    } catch (error) {
      sendOk(res, {
        error_code: 'CONFIGURATION_FAILED',
        error_type: error instanceof Error ? error.message : 'unknown error',
      });
      return;
    }

    await saveSecret(req, 'applicationId', applicationId);
    await saveSecret(req, 'secretKey', secretKey);

    sendOk(res, { configured: true });
  } catch (error) {
    sendError(res, error);
  }
});

app.post('/aspsps', async (req: Request, res: Response) => {
  try {
    const { country } = req.body || {};
    const aspsps = await enableBankingService.getAspsps(
      country,
      getSecretOptions(req),
    );
    sendOk(res, { aspsps });
  } catch (error) {
    sendOk(res, {
      error: error instanceof Error ? error.message : 'unknown error',
    });
  }
});

app.post('/start-auth', async (req: Request, res: Response) => {
  try {
    const options = getSecretOptions(req);
    const { aspsp, redirectUrl, maxConsentValidity } = req.body || {};

    if (!aspsp || !redirectUrl) {
      sendOk(res, {
        error_code: 'INVALID_INPUT',
        error_type: 'Missing aspsp or redirectUrl',
      });
      return;
    }

    const state = uuidv4();
    const authResponse = await enableBankingService.startAuth(
      aspsp,
      redirectUrl,
      state,
      typeof maxConsentValidity === 'number' ? maxConsentValidity : undefined,
      options,
    );
    stateFileIds.set(state, options.fileId);
    setTimeout(() => stateFileIds.delete(state), POLL_TIMEOUT_MS);

    sendOk(res, {
      url: authResponse.url,
      state,
    });
  } catch (error) {
    sendOk(res, {
      error: error instanceof Error ? error.message : 'unknown error',
    });
  }
});

app.post('/complete-auth', async (req: Request, res: Response) => {
  const { code, state } = req.body || {};

  if (!code) {
    sendOk(res, {
      error_code: 'INVALID_INPUT',
      error_type: 'Missing code',
    });
    return;
  }

  try {
    const fileId = stateFileIds.get(state) ?? getFileIdFromRequest(req);
    const options = { fileId, req };
    const session = await enableBankingService.createSession(code, options);
    const result = await buildSessionResult(
      session,
      options,
      extractPsuHeaders(req),
    );

    if (state) {
      completedAuths.set(state, result);
      setTimeout(() => completedAuths.delete(state), COMPLETED_AUTH_TTL_MS);

      const pending = pendingAuths.get(state);
      if (pending) {
        pending.resolve(result);
        cleanupPendingAuth(state);
      }
      stateFileIds.delete(state);
    }

    sendOk(res, result);
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
      stateFileIds.delete(state);
    }

    sendOk(res, errorResult);
  }
});

app.post('/poll-auth', async (req: Request, res: Response) => {
  const { state } = req.body || {};

  if (!state) {
    sendOk(res, {
      error_code: 'INVALID_INPUT',
      error_type: 'Missing state',
    });
    return;
  }

  const waiterId = String(++nextWaiterId);
  let hasClientDisconnected = false;

  try {
    if (completedAuths.has(state)) {
      const result = completedAuths.get(state);
      completedAuths.delete(state);
      sendOk(res, result);
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
        safeReject(new Error('timeout'));
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

    if (hasClientDisconnected || res.destroyed || res.writableEnded) {
      return;
    }

    sendOk(res, result);
  } catch (error) {
    cleanupPendingAuth(state, waiterId);
    if (hasClientDisconnected || res.destroyed || res.writableEnded) {
      return;
    }
    sendError(res, error);
  }
});

app.post('/poll-auth-stop', async (req: Request, res: Response) => {
  const { state } = req.body || {};
  if (typeof state === 'string') {
    cleanupPendingAuth(state);
  }
  sendOk(res, {});
});

app.post('/accounts', (_req: Request, res: Response) => {
  sendOk(res, {
    error_code: 'AUTH_REQUIRED',
    error_type: 'Enable Banking accounts must be linked through authorization',
  });
});

app.post('/transactions', async (req: Request, res: Response) => {
  try {
    const options = getSecretOptions(req);
    const { accountId, startDate } = req.body || {};

    if (!accountId || !startDate) {
      sendOk(res, {
        error_code: 'INVALID_INPUT',
        error_type: 'Missing accountId or startDate',
      });
      return;
    }

    const psuHeaders = extractPsuHeaders(req);
    const dateTo = new Date().toISOString().split('T')[0];
    const dateFrom =
      typeof startDate === 'string'
        ? startDate
        : new Date(startDate).toISOString().split('T')[0];

    const balanceResult = await enableBankingService.getBalances(
      accountId,
      psuHeaders,
      options,
    );
    const balances = balanceResult.balances.map(normalizeBalance);
    const preferredBalance =
      balances.find(b => b.balanceType === 'CLAV') ?? balances[0];
    const startingBalance = preferredBalance
      ? preferredBalance.balanceAmount.amount
      : 0;

    const rawTransactions = await enableBankingService.getAllTransactions(
      accountId,
      dateFrom,
      dateTo,
      psuHeaders,
      options,
    );

    const all = rawTransactions.map(normalizeTransaction);
    const booked = all.filter(tx => tx.booked);
    const pending = all.filter(tx => !tx.booked);

    sendOk(res, {
      transactions: {
        all,
        booked,
        pending,
      },
      balances,
      startingBalance,
    });
  } catch (error) {
    if (error instanceof EnableBankingError) {
      if (error.error_code === 'INVALID_ACCESS_TOKEN') {
        sendOk(res, {
          error_type: 'ITEM_ERROR',
          error_code: 'ITEM_LOGIN_REQUIRED',
        });
        return;
      }

      sendOk(res, {
        error_type:
          error.error_code === 'NOT_FOUND' ? 'INVALID_INPUT' : error.error_code,
        error_code: error.error_code,
      });
      return;
    }

    sendOk(res, {
      error_type: 'INTERNAL_ERROR',
      error_code: 'INTERNAL_ERROR',
    });
  }
});

console.log('Enable Banking Bank Sync Plugin loaded');
