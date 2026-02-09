import express from 'express';

import { handleError } from '../app-gocardless/util/handle-error';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from '../util/middlewares';

import { bunqService } from './services/bunq-service';

const app = express();
export { app as handlers };
app.use(express.json());
app.use(requestLoggerMiddleware);
app.use(validateSessionMiddleware);

app.post(
  '/status',
  handleError(async (req, res) => {
    const data = await bunqService.getStatus();

    res.send({
      status: 'ok',
      data,
    });
  }),
);

app.post(
  '/accounts',
  handleError(async (req, res) => {
    const data = await bunqService.listAccounts();

    res.send({
      status: 'ok',
      data,
    });
  }),
);

app.post(
  '/transactions',
  handleError(async (req, res) => {
    const { accountId, startDate, cursor, importCategory } = req.body || {};
    const data = await bunqService.listTransactions({
      accountId,
      startDate,
      cursor,
      importCategory,
    });

    res.send({
      status: 'ok',
      data,
    });
  }),
);
