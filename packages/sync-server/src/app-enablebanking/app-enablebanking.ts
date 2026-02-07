import express, { type Request } from 'express';
import { type ParamsDictionary } from 'express-serve-static-core';

import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from '../util/middlewares.js';

import { type EnableBankingEndpoints } from './models/enablebanking.js';
import { enableBankingservice } from './services/enablebanking-services.js';
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

  if (!applicationId) {
    throw badRequestVariableError('applicationId', '/enablebanking/configure');
  }
  if (!secret) {
    throw badRequestVariableError('secret', '/enablebanking/configure');
  }

  await enableBankingservice.setupSecrets(applicationId, secret);
  return;
});

post('/status', async () => {
  try {
    const configured = await enableBankingservice.isConfigured();
    return { configured };
  } catch (error) {
    // If checking configuration fails, it means it's not properly configured
    console.error('Failed to check EnableBanking configuration status:', error);
    return { configured: false };
  }
});

post('/countries', async () => {
  if (!enableBankingservice.secretsAreSetup()) {
    throw new EnableBankingSetupError();
  }
  const application = await enableBankingservice.getApplication();
  return application.countries;
});

post('/get_aspsps', async req => {
  if (!enableBankingservice.secretsAreSetup()) {
    throw new EnableBankingSetupError();
  }
  const { country } = req.body;
  const responseData = (await enableBankingservice.getASPSPs(country)).aspsps;
  return responseData;
});

post('/start_auth', async (req: Request) => {
  if (!enableBankingservice.secretsAreSetup()) {
    throw new EnableBankingSetupError();
  }
  const { aspsp, country } = req.body;

  const origin = req.headers.origin;
  if (!origin) {
    throw new BadRequestError(
      "'origin' header should be passed to '/start_auth'.",
    );
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
  } catch (error) {
    if (error instanceof BadRequestError) {
      throw error;
    }
    throw new BadRequestError(
      `Invalid origin header: ${error instanceof Error ? error.message : 'malformed URL'}`,
    );
  }

  return await enableBankingservice.startAuth(
    country,
    aspsp,
    origin,
    180 * 24 * 3600,
  );
});

post('/get_session', async (req: Request) => {
  const { state } = req.body;
  if (!state) {
    throw new BadRequestError(
      "Variable 'state' should be passed to '/enable_banking/get_session'.",
    );
  }

  const entry = enableBankingservice.getSessionEntry(state);
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
  return await enableBankingservice.getAccounts(entry.sessionId);
});

post('/complete_auth', async (req: Request) => {
  const { state, code } = req.body;

  if (!state) {
    throw badRequestVariableError('state', '/enable_banking/complete_auth');
  }

  if (!code) {
    throw badRequestVariableError('code', '/enable_banking/complete_auth');
  }

  await enableBankingservice.authorizeSession(state, code);

  return;
});

post('/fail_auth', async (req: Request) => {
  const { state, error } = req.body;

  if (!state) {
    throw badRequestVariableError('state', '/enable_banking/fail_auth');
  }

  enableBankingservice.failSession(state, error ?? 'unknown_error');

  return;
});

post('/get_accounts', async (req: Request) => {
  if (!enableBankingservice.secretsAreSetup()) {
    throw new EnableBankingSetupError();
  }
  const { session_id } = req.body;

  if (!session_id) {
    throw badRequestVariableError('session_id', '/enable_banking/get_accounts');
  }

  return await enableBankingservice.getAccounts(session_id);
});

post('/transactions', async (req: Request) => {
  if (!enableBankingservice.secretsAreSetup()) {
    throw new EnableBankingSetupError();
  }
  const { startDate, endDate, account_id, bank_id } = req.body;

  if (!account_id) {
    throw badRequestVariableError('account_id', '/enablebanking/transactions');
  }
  const transactions = await enableBankingservice.getTransactions(
    account_id,
    startDate,
    endDate,
    bank_id,
  );

  const currentBalance =
    await enableBankingservice.getCurrentBalance(account_id);

  // Convert to integer cents before arithmetic to avoid floating-point errors
  const currentBalanceCents = Math.round(currentBalance * 100);
  const startingBalanceCents = transactions.reduce(
    (acc, t) => acc - Math.round(t.amount * 100),
    currentBalanceCents,
  );

  return {
    transactions,
    startingBalance: startingBalanceCents, // Already in cents (integer)
  };
});
