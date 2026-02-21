import express from 'express';
import type { Request, Response } from 'express';

import { handleError } from '../app-gocardless/util/handle-error';
import { SecretName, secretsService } from '../services/secrets-service';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from '../util/middlewares';

import * as enableBankingService from './services/enablebanking-service';

const app = express();
export { app as handlers };
app.use(requestLoggerMiddleware);
app.use(express.json());
app.use(validateSessionMiddleware);

function getCredentials() {
  const appId = secretsService.get(SecretName.enablebanking_appId);
  const privateKey = secretsService.get(SecretName.enablebanking_privateKey);
  return { appId, privateKey };
}

app.post(
  '/status',
  handleError(async (req: Request, res: Response) => {
    const { appId, privateKey } = getCredentials();
    const configured = appId != null && privateKey != null;

    if (!configured) {
      res.send({ status: 'ok', data: { configured: false } });
      return;
    }

    const result = await enableBankingService.checkStatus(appId, privateKey);
    res.send({ status: 'ok', data: result });
  }),
);

app.post(
  '/get-banks',
  handleError(async (req: Request, res: Response) => {
    const { appId, privateKey } = getCredentials();
    if (!appId || !privateKey) {
      res.send({
        status: 'ok',
        data: {
          error_code: 'NOT_CONFIGURED',
          error_type: 'Enable Banking credentials not set',
        },
      });
      return;
    }

    const { country } = req.body ?? {};
    const banks = await enableBankingService.getBanks(
      appId,
      privateKey,
      country ?? 'FI',
    );
    res.send({ status: 'ok', data: banks });
  }),
);

app.post(
  '/create-session',
  handleError(async (req: Request, res: Response) => {
    const { appId, privateKey } = getCredentials();
    if (!appId || !privateKey) {
      res.send({
        status: 'ok',
        data: {
          error_code: 'NOT_CONFIGURED',
          error_type: 'Enable Banking credentials not set',
        },
      });
      return;
    }

    const { aspsp, redirectUrl, country } = req.body ?? {};
    const result = await enableBankingService.createSession(
      appId,
      privateKey,
      aspsp,
      redirectUrl,
      country,
    );
    res.send({ status: 'ok', data: result });
  }),
);

app.post(
  '/complete-session',
  handleError(async (req: Request, res: Response) => {
    const { appId, privateKey } = getCredentials();
    if (!appId || !privateKey) {
      res.send({
        status: 'ok',
        data: {
          error_code: 'NOT_CONFIGURED',
          error_type: 'Enable Banking credentials not set',
        },
      });
      return;
    }

    const { code } = req.body ?? {};
    const result = await enableBankingService.completeSession(
      appId,
      privateKey,
      code,
    );
    res.send({ status: 'ok', data: result });
  }),
);

app.post(
  '/transactions',
  handleError(async (req: Request, res: Response) => {
    const { appId, privateKey } = getCredentials();
    if (!appId || !privateKey) {
      res.send({
        status: 'ok',
        data: {
          error_code: 'NOT_CONFIGURED',
          error_type: 'Enable Banking credentials not set',
        },
      });
      return;
    }

    const { accountId, startDate } = req.body ?? {};

    try {
      const result = await enableBankingService.getTransactions(
        appId,
        privateKey,
        accountId,
        startDate,
      );
      res.send({ status: 'ok', data: result });
    } catch (error) {
      res.send({
        status: 'ok',
        data: { error: (error as Error).message },
      });
    }
  }),
);
