import express, { Request } from 'express';

import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from '../util/middlewares.js';

import {
  EnableBankingAuthenticationStartResponse,
  EnableBankingBank,
  EnableBankingStatusResponse,
  EnableBankingTransactionsResponse,
  EnableBankingToken,
} from './models/enablebanking.js';
import { enableBankingservice } from './services/enablebanking-services.js';
import {
  BadRequestError,
  badRequestVariableError,
  handleErrorInHandler,
  NotReadyError,
} from './utils/errors.js';
const app = express();
app.use(requestLoggerMiddleware);
export { app as handlers };

app.use(express.json());
app.use(validateSessionMiddleware);

app.post(
  '/configure',
  handleErrorInHandler(async (req: Request) => {
    const { applicationId, secret } = req.body || {};

    enableBankingservice.setupSecrets(applicationId, secret);
    return;
  }),
);

app.post(
  '/status',
  handleErrorInHandler<EnableBankingStatusResponse>(async () => {
    const data: EnableBankingStatusResponse = {
      configured: await enableBankingservice.isConfigured(),
    };
    return data;
  }),
);

app.post(
  '/countries',
  handleErrorInHandler(async () => {
    const application = await enableBankingservice.getApplication();
    return application.countries;
  }),
);

app.post(
  '/get_aspsps',
  handleErrorInHandler<EnableBankingBank[]>(async () => {
    const responseData = (await enableBankingservice.getASPSPs()).aspsps;
    return responseData;
  }),
);

app.post(
  '/start_auth',
  handleErrorInHandler<EnableBankingAuthenticationStartResponse>(
    async (req: Request) => {
      const { aspsp, country } = req.body || {};

      const origin = req.headers.origin;
      if (!origin) {
        throw new BadRequestError(
          "'origin' header should be passed to '/start_auth'.",
        );
      }
      return await enableBankingservice.startAuth(
        country,
        aspsp,
        origin,
        180 * 24 * 3600,
      );
    },
  ),
);

app.post(
  '/get_session',
  handleErrorInHandler<EnableBankingToken>(async (req: Request) => {
    const { state } = req.body || {};
    if (!state) {
      throw new BadRequestError(
        "Variable 'state' should be passed to '/enable_banking/get_session'.",
      );
    }

    const session_id = enableBankingservice.getSessionIdFromState(state);
    if (!session_id) {
      throw new NotReadyError('Authorization flow has not yet finished.');
    }
    return await enableBankingservice.getAccounts(session_id);
  }),
);

app.post(
  '/complete_auth',
  handleErrorInHandler(async (req: Request) => {
    const { state, code } = req.body || {};

    if (!state) {
      throw badRequestVariableError('state', '/enable_banking/complete_auth');
    }

    if (!code) {
      throw badRequestVariableError('code', '/enable_banking/complete_auth');
    }

    await enableBankingservice.authorizeSession(state, code);

    return;
  }),
);

app.post(
  '/get_accounts',
  handleErrorInHandler<EnableBankingToken>(async (req: Request) => {
    const { session_id } = req.body || {};

    if (!session_id) {
      throw badRequestVariableError(
        'session_id',
        '/enable_banking/get_accounts',
      );
    }

    return await enableBankingservice.getAccounts(session_id);
  }),
);

app.post(
  '/transactions',
  handleErrorInHandler<EnableBankingTransactionsResponse>(
    async (req: Request) => {
      const { startDate, endDate, account_id, bank_id } = req.body || {};

      if (!account_id) {
        throw badRequestVariableError(
          'accountId',
          '/enablebanking/transactions',
        );
      }
      const transactions = await enableBankingservice.getTransactions(
        account_id,
        startDate,
        endDate,
        bank_id,
      );

      return {
        transactions,
      };
    },
  ),
);
