import express from 'express';
import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

import { isAdmin } from '../account-db.js';
import { SecretName, secretsService } from '../services/secrets-service.js';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from '../util/middlewares.js';

import type { EnableBankingEndpoints } from './models/enablebanking.js';
import { enableBankingService } from './services/enablebanking-services.js';
import {
  BadRequestError,
  badRequestVariableError,
  EnableBankingError,
  EnableBankingSetupError,
  handleErrorInHandler,
  NotReadyError,
} from './utils/errors.js';
const app = express();
app.use(requestLoggerMiddleware);
export { app as handlers };

app.use(express.json());

// Utility function to escape HTML to prevent XSS attacks
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Apply session validation middleware to all routes below this point
app.use(validateSessionMiddleware);

function post<T extends keyof EnableBankingEndpoints>(
  path: T,
  handler: (
    req: Request<
      ParamsDictionary,
      EnableBankingEndpoints[T]['response'],
      EnableBankingEndpoints[T]['body']
    >,
  ) => Promise<EnableBankingEndpoints[T]['response']>,
) {
  app.post(path, handleErrorInHandler<T>(handler));
}
post('/configure', async req => {
  const { applicationId, secret } = req.body;

  if (applicationId === undefined) {
    throw badRequestVariableError('applicationId', '/enablebanking/configure');
  }
  if (secret === undefined) {
    throw badRequestVariableError('secret', '/enablebanking/configure');
  }

  if (applicationId === null || secret === null) {
    secretsService.set(SecretName.enablebanking_applicationId, null);
    secretsService.set(SecretName.enablebanking_secret, null);
    return;
  }

  await enableBankingService.setupSecrets(applicationId, secret);
  return;
});

post('/status', async () => {
  try {
    const configured = await enableBankingService.isConfigured();
    return { configured };
  } catch (error) {
    // If checking configuration fails, it means it's not properly configured
    console.error('Failed to check EnableBanking configuration status:', error);
    return { configured: false };
  }
});

post('/countries', async () => {
  if (!enableBankingService.secretsAreSetup()) {
    throw new EnableBankingSetupError();
  }
  const application = await enableBankingService.getApplication();
  return application.countries;
});

post('/get_aspsps', async req => {
  if (!enableBankingService.secretsAreSetup()) {
    throw new EnableBankingSetupError();
  }
  const { country } = req.body;

  if (!country) {
    throw badRequestVariableError('country', '/enablebanking/get_aspsps');
  }

  if (typeof country !== 'string' || country.trim() === '') {
    throw new BadRequestError("Variable 'country' must be a non-empty string.");
  }

  const responseData = (await enableBankingService.getASPSPs(country)).aspsps;
  return responseData;
});

post('/start_auth', async req => {
  if (!enableBankingService.secretsAreSetup()) {
    throw new EnableBankingSetupError();
  }
  const { aspsp, country } = req.body;

  if (!country) {
    throw badRequestVariableError('country', '/enablebanking/start_auth');
  }

  if (!aspsp) {
    throw badRequestVariableError('aspsp', '/enablebanking/start_auth');
  }

  if (typeof country !== 'string' || country.trim() === '') {
    throw new BadRequestError("Variable 'country' must be a non-empty string.");
  }

  if (typeof aspsp !== 'string' || aspsp.trim() === '') {
    throw new BadRequestError("Variable 'aspsp' must be a non-empty string.");
  }

  const origin = req.headers.origin;
  if (!origin) {
    throw badRequestVariableError('origin', '/enablebanking/start_auth');
  }

  // Validate origin to prevent SSRF attacks
  try {
    const originUrl = new URL(origin);
    // Only allow http and https protocols
    if (originUrl.protocol !== 'http:' && originUrl.protocol !== 'https:') {
      throw new BadRequestError(
        'Invalid origin protocol. Only http and https are allowed.',
      );
    }

    const forwardedHost = req.headers['x-forwarded-host'];
    const requestHostHeader =
      typeof forwardedHost === 'string'
        ? forwardedHost
        : Array.isArray(forwardedHost)
          ? forwardedHost[0]
          : req.headers.host;
    const requestHost = requestHostHeader?.split(',')[0]?.trim();

    if (!requestHost || originUrl.host !== requestHost) {
      throw new BadRequestError('Invalid origin host header.');
    }
  } catch (error) {
    if (error instanceof BadRequestError) {
      throw error;
    }
    throw new BadRequestError(
      `Invalid origin header: ${error instanceof Error ? error.message : 'malformed URL'}`,
    );
  }

  return await enableBankingService.startAuth(
    country,
    aspsp,
    origin,
    180 * 24 * 3600,
  );
});

post('/get_session', async req => {
  if (!enableBankingService.secretsAreSetup()) {
    throw new EnableBankingSetupError();
  }
  const { state } = req.body;
  if (!state) {
    throw badRequestVariableError('state', '/enablebanking/get_session');
  }

  const entry = enableBankingService.getSessionEntry(state);
  if (!entry) {
    throw new NotReadyError('Authorization flow has not yet finished.');
  }
  if (entry.error) {
    throw new EnableBankingError(
      'AUTH_FAILED',
      `Authentication failed: ${entry.error}`,
    );
  }
  if (!entry.sessionId) {
    throw new NotReadyError('Authorization flow has not yet finished.');
  }
  return await enableBankingService.getAccounts(entry.sessionId);
});

post('/complete_auth', async req => {
  const { state, code } = req.body;

  if (!state) {
    throw badRequestVariableError('state', '/enablebanking/complete_auth');
  }

  if (!code) {
    throw badRequestVariableError('code', '/enablebanking/complete_auth');
  }

  await enableBankingService.authorizeSession(state, code);

  return;
});

post('/fail_auth', async req => {
  const { state, error } = req.body;

  if (!state) {
    throw badRequestVariableError('state', '/enablebanking/fail_auth');
  }

  enableBankingService.failSession(state, error ?? 'unknown_error');

  return;
});

post('/get_accounts', async req => {
  if (!enableBankingService.secretsAreSetup()) {
    throw new EnableBankingSetupError();
  }
  const { session_id } = req.body;

  if (!session_id) {
    throw badRequestVariableError(
      'session_id',
      '/enablebanking/get_accounts',
    );
  }

  return await enableBankingService.getAccounts(session_id);
});

post('/transactions', async req => {
  if (!enableBankingService.secretsAreSetup()) {
    throw new EnableBankingSetupError();
  }
  const { startDate, endDate, account_id, bank_id } = req.body;

  if (!account_id) {
    throw badRequestVariableError('account_id', '/enablebanking/transactions');
  }
  const transactions = await enableBankingService.getTransactions(
    account_id,
    startDate,
    endDate,
    bank_id,
  );

  const currentBalance =
    await enableBankingService.getCurrentBalance(account_id);

  // Convert to integer cents
  const currentBalanceCents = Math.round(currentBalance * 100);

  return {
    transactions,
    startingBalance: currentBalanceCents, // Return current balance, client will calculate starting balance
  };
});

// Admin-only endpoint to clear all Enable Banking sessions
app.post(
  '/admin/clear_sessions',
  validateSessionMiddleware,
  async (_req: Request, res: Response) => {
    if (!isAdmin(res.locals.user_id)) {
      res.status(403).send({
        status: 'error',
        reason: 'forbidden',
        details: 'permission-not-found',
      });
      return;
    }

    const cleared = enableBankingService.clearAllSessions();
    res.send({ status: 'ok', data: { cleared } });
  },
);
