import express from 'express';

import { SecretName, secretsService } from '../services/secrets-service.js';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from '../util/middlewares.js';

import { enableBankingService } from './services/enablebanking-services.js';
import {
  authFailedError,
  BadRequestError,
  badRequestMessageError,
  badRequestVariableError,
  EnableBankingSetupError,
  handleError,
  invalidNonEmptyStringError,
  notReadyAuthorizationError,
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

app.post(
  '/configure',
  handleError(async (req, res) => {
    const { applicationId, secret } = req.body;

    if (applicationId === undefined) {
      throw badRequestVariableError(
        'applicationId',
        '/enablebanking/configure',
      );
    }
    if (secret === undefined) {
      throw badRequestVariableError('secret', '/enablebanking/configure');
    }

    if (applicationId === null && secret === null) {
      secretsService.set(SecretName.enablebanking_applicationId, null);
      secretsService.set(SecretName.enablebanking_secret, null);
      res.send({ status: 'ok', data: {} });
      return;
    }

    if (applicationId === null) {
      throw badRequestVariableError(
        'applicationId',
        '/enablebanking/configure',
      );
    }
    if (secret === null) {
      throw badRequestVariableError('secret', '/enablebanking/configure');
    }

    await enableBankingService.setupSecrets(applicationId, secret);
    res.send({ status: 'ok', data: {} });
  }),
);

app.post(
  '/status',
  handleError(async (req, res) => {
    try {
      const configured = await enableBankingService.isConfigured();
      res.send({ status: 'ok', data: { configured } });
    } catch (error) {
      // If checking configuration fails, it means it's not properly configured
      console.error(
        'Failed to check EnableBanking configuration status:',
        error,
      );
      res.send({ status: 'ok', data: { configured: false } });
    }
  }),
);

app.post(
  '/countries',
  handleError(async (req, res) => {
    if (!enableBankingService.secretsAreSetup()) {
      throw new EnableBankingSetupError();
    }
    const application = await enableBankingService.getApplication();
    res.send({ status: 'ok', data: application.countries });
  }),
);

app.post(
  '/get_aspsps',
  handleError(async (req, res) => {
    if (!enableBankingService.secretsAreSetup()) {
      throw new EnableBankingSetupError();
    }
    const { country } = req.body;

    if (!country) {
      throw badRequestVariableError('country', '/enablebanking/get_aspsps');
    }

    if (typeof country !== 'string' || country.trim() === '') {
      throw invalidNonEmptyStringError('country');
    }

    const responseData = (await enableBankingService.getASPSPs(country)).aspsps;
    res.send({ status: 'ok', data: responseData });
  }),
);

app.post(
  '/start_auth',
  handleError(async (req, res) => {
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
      throw invalidNonEmptyStringError('country');
    }

    if (typeof aspsp !== 'string' || aspsp.trim() === '') {
      throw invalidNonEmptyStringError('aspsp');
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
        throw badRequestMessageError(
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
        throw badRequestMessageError('Invalid origin host header.');
      }
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      throw badRequestMessageError(
        `Invalid origin header: ${error instanceof Error ? error.message : 'malformed URL'}`,
      );
    }

    const data = await enableBankingService.startAuth(
      country,
      aspsp,
      origin,
      180 * 24 * 3600,
    );
    res.send({ status: 'ok', data });
  }),
);

app.post(
  '/get_session',
  handleError(async (req, res) => {
    if (!enableBankingService.secretsAreSetup()) {
      throw new EnableBankingSetupError();
    }
    const { state } = req.body;
    if (!state) {
      throw badRequestVariableError('state', '/enablebanking/get_session');
    }

    const entry = enableBankingService.getSessionEntry(state);
    if (!entry) {
      throw notReadyAuthorizationError();
    }
    if (entry.error) {
      throw authFailedError(entry.error);
    }
    if (!entry.sessionId) {
      throw notReadyAuthorizationError();
    }
    const data = await enableBankingService.getAccounts(entry.sessionId);
    res.send({ status: 'ok', data });
  }),
);

app.post(
  '/complete_auth',
  handleError(async (req, res) => {
    const { state, code } = req.body;

    if (!state) {
      throw badRequestVariableError('state', '/enablebanking/complete_auth');
    }

    if (!code) {
      throw badRequestVariableError('code', '/enablebanking/complete_auth');
    }

    try {
      await enableBankingService.authorizeSession(state, code);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      enableBankingService.failSession(state, errorMessage);
      throw error;
    }

    res.send({ status: 'ok', data: {} });
  }),
);

app.post(
  '/fail_auth',
  handleError(async (req, res) => {
    const { state, error } = req.body;

    if (!state) {
      throw badRequestVariableError('state', '/enablebanking/fail_auth');
    }

    enableBankingService.failSession(state, error ?? 'unknown_error');

    res.send({ status: 'ok', data: {} });
  }),
);

app.post(
  '/get_accounts',
  handleError(async (req, res) => {
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

    const data = await enableBankingService.getAccounts(session_id);
    res.send({ status: 'ok', data });
  }),
);

app.post(
  '/transactions',
  handleError(async (req, res) => {
    if (!enableBankingService.secretsAreSetup()) {
      throw new EnableBankingSetupError();
    }
    const { startDate, account_id, bank_id } = req.body;

    if (!account_id) {
      throw badRequestVariableError(
        'account_id',
        '/enablebanking/transactions',
      );
    }
    const transactions = await enableBankingService.getTransactions(
      account_id,
      startDate,
      undefined,
      bank_id,
    );

    const currentBalance =
      await enableBankingService.getCurrentBalance(account_id);

    // Return current balance in integer cents — the client computes the
    // opening balance by subtracting fetched transactions, same as
    // GoCardless and PluggyAI.
    const currentBalanceCents = Math.round(currentBalance * 100);

    res.send({
      status: 'ok',
      data: {
        transactions,
        startingBalance: currentBalanceCents,
      },
    });
  }),
);
