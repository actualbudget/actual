import express, { Request, response, Response } from 'express';

import { handleError } from '../app-gocardless/util/handle-error.js';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from '../util/middlewares.js';

import { enableBankingservice } from './services/enablebanking-services.js';
import {EnableBankingAuthenticationStartResponse, EnableBankingBank, EnableBankingStatusResponse, EnableBankingTransactionsResponse} from 'loot-core/types/models/enablebanking.js';
import { HalTransactions, Transaction } from './models/models-enablebanking.js';

const app = express();
app.use(requestLoggerMiddleware);
export { app as handlers };

app.use(express.json());
app.use(validateSessionMiddleware);

app.post(
  '/configure',
  handleError(async (req: Request, res: Response) => {
    const { applicationId, secret } = req.body || {};

    enableBankingservice.setupSecrets(applicationId, secret);

    res.send({
      status: 'ok',
    });
  }),
);

app.post(
  '/status',
  handleError(async (req: Request, res: Response) => {
    const data: EnableBankingStatusResponse = {configured: await enableBankingservice.isConfigured()}

    res.send({
      status: 'ok',
      data: data,
    });
  }),
);

app.post(
  '/countries',
  handleError(async (req: Request, res: Response) => {
    const application = await enableBankingservice.getApplication();
    res.send({
      status: 'ok',
      data: application.countries,
    });
  }),
);

app.post(
  '/get_aspsps',
  handleError(async (req: Request, res: Response) => {
    const responseData:EnableBankingBank[] = (await enableBankingservice.getASPSPs()).aspsps;
    res.send({
      status: 'ok',
      data: responseData,
    });
  }),
);

app.post(
  '/start_auth',
  handleError(async (req: Request, res: Response) => {
    const { aspsp, country } = req.body || {};

    const origin = req.headers.origin;
    if (!origin) {
      res.sendStatus(400).send({ message: 'No origin in header.' });
      return;
    }

    res.send({
      status: 'ok',
      data: await enableBankingservice.startAuth(
        country,
        aspsp,
        origin,
        3600,
      ),
    });
  }),
);

app.post(
  '/get_session',
  handleError(async (req: Request, res: Response) => {
    const { state } = req.body || {};

    const session_id = enableBankingservice.getSessionIdFromState(state);
    if (!session_id) {
      res.send({ status: 'ok' });
      return;
    }
    const response = await enableBankingservice.getAccounts(session_id);

    res.send({
      status: 'ok',
      data: response,
    });
  }),
);

app.post(
  '/complete_auth',
  handleError(async (req: Request, res: Response) => {
    const { state, code } = req.body || {};

    await enableBankingservice.authorizeSession(state, code);

    res.send({
      status: 'ok',
    });
  }),
);

app.post(
  '/get_accounts',
  handleError(async (req: Request, res: Response) => {
    const { session_id } = req.body || {};
    const resp = await enableBankingservice.getAccounts(session_id);
    res.send({
      status: 'ok',
      data: resp,
    });
  }),
);

app.post(
  '/transactions',
  handleError(async (req: Request, res: Response) => {
    const {
      startDate,
      endDate,
      accountId,
      includeBalance = true,
    } = req.body || {};
    const jwt = enableBankingservice.getJWT();

    const baseHeaders = {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    };
    console.log("got here")

    const params = new URLSearchParams();
    if (typeof startDate !== 'undefined') {
      params.set('date_from', startDate);
    }

    let finished = false;
    const transactions:Transaction[] = [];
    while (!finished) {
      const response: globalThis.Response = await fetch(
        `https://api.enablebanking.com/accounts/${accountId}/transactions?` +
          params.toString(),
        {
          headers: baseHeaders,
        },
      );
      const data = await response.json() as HalTransactions;
      console.log("printing data", data);
      if(data.transactions){
        transactions.push(...data.transactions);
      }
      if (data.continuation_key) {
        params.set('continuation_key', data.continuation_key);
      } else {
        finished = true;
      }
    }

    const data:EnableBankingTransactionsResponse = {
      transactions: transactions.map( t =>{
        const isDebtor = t.credit_debit_indicator == 'DBIT';

        const payeeObject = isDebtor? t.creditor:t.debtor;

        const payeeName = payeeObject? payeeObject.name:t.remittance_information[0];
        return {
          amount:parseFloat(t.transaction_amount.amount)*(isDebtor? -1:1),
          payee: payeeName,
          notes:t.remittance_information.join(""),
          date:t.transaction_date
        }  
      })
    }

    res.send({
      status: 'ok',
      data,
    });
  }),
);
