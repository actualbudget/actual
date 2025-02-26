import express from 'express';

import { handleError } from '../app-gocardless/util/handle-error.js';
import { SecretName, secretsService } from '../services/secrets-service.js';
import { requestLoggerMiddleware } from '../util/middlewares.js';

import { pluggyaiService } from './pluggyai-service.js';

const app = express();
export { app as handlers };
app.use(express.json());
app.use(requestLoggerMiddleware);

app.post(
  '/status',
  handleError(async (req, res) => {
    const clientId = secretsService.get(SecretName.pluggyai_clientId);
    const configured = clientId != null;

    res.send({
      status: 'ok',
      data: {
        configured,
      },
    });
  }),
);

app.post(
  '/accounts',
  handleError(async (req, res) => {
    try {
      const itemIds = secretsService
        .get(SecretName.pluggyai_itemIds)
        .split(',')
        .map(item => item.trim());

      let accounts = [];

      for (const item of itemIds) {
        const partial = await pluggyaiService.getAccountsByItemId(item);
        accounts = accounts.concat(partial.results);
      }

      res.send({
        status: 'ok',
        data: {
          accounts,
        },
      });
    } catch (error) {
      res.send({
        status: 'ok',
        data: {
          error: error.message,
        },
      });
    }
  }),
);

app.post(
  '/transactions',
  handleError(async (req, res) => {
    const { accountId, startDate } = req.body;

    try {
      let transactions = [];
      let result = await pluggyaiService.getTransactionsByAccountId(
        accountId,
        startDate,
        500,
        1,
      );
      transactions = transactions.concat(result.results);
      const totalPages = result.totalPages;
      while (result.page !== totalPages) {
        result = await pluggyaiService.getTransactionsByAccountId(
          accountId,
          startDate,
          500,
          result.page + 1,
        );
        transactions = transactions.concat(result.results);
      }

      const account = await pluggyaiService.getAccountById(accountId);

      let startingBalance = parseInt(
        Math.round(account.balance * 100).toString(),
      );
      if (account.type === 'CREDIT') {
        startingBalance = -startingBalance;
      }
      const date = getDate(new Date(account.updatedAt));

      const balances = [
        {
          balanceAmount: {
            amount: startingBalance,
            currency: account.currencyCode,
          },
          balanceType: 'expected',
          referenceDate: date,
        },
        {
          balanceAmount: {
            amount: startingBalance,
            currency: account.currencyCode,
          },
          balanceType: 'interimAvailable',
          referenceDate: date,
        },
      ];

      const all = [];
      const booked = [];
      const pending = [];

      for (const trans of transactions) {
        const newTrans = {};

        let dateToUse = 0;

        if (trans.status === 'PENDING') {
          newTrans.booked = false;
        } else {
          newTrans.booked = true;
        }
        dateToUse = trans.date;

        const transactionDate = new Date(dateToUse);

        if (transactionDate < startDate) {
          continue;
        }

        newTrans.date = getDate(transactionDate);

        newTrans.payeeName = '';
        if (
          trans.merchant &&
          (trans.merchant.name || trans.merchant.businessName)
        ) {
          newTrans.payeeName =
            trans.merchant.name || trans.merchant.businessName;
        } else if (
          trans.type === 'DEBIT' &&
          trans.paymentData &&
          trans.paymentData.receiver &&
          trans.paymentData.receiver.name
        ) {
          newTrans.payeeName = trans.paymentData.receiver.name;
        } else if (
          trans.type === 'CREDIT' &&
          trans.paymentData &&
          trans.paymentData.payer &&
          trans.paymentData.payer.name
        ) {
          newTrans.payeeName = trans.paymentData.payer.name;
        } else if (
          trans.type === 'DEBIT' &&
          trans.paymentData &&
          trans.paymentData.receiver &&
          trans.paymentData.receiver.documentNumber &&
          trans.paymentData.receiver.documentNumber.value
        ) {
          newTrans.payeeName = trans.paymentData.receiver.documentNumber.value;
        } else if (
          trans.type === 'CREDIT' &&
          trans.paymentData &&
          trans.paymentData.payer &&
          trans.paymentData.payer.documentNumber &&
          trans.paymentData.payer.documentNumber.value
        ) {
          newTrans.payeeName = trans.paymentData.payer.documentNumber.value;
        }

        newTrans.remittanceInformationUnstructured = trans.descriptionRaw;
        let amountInCurrency = trans.amountInAccountCurrency ?? trans.amount;
        amountInCurrency = Math.round(amountInCurrency * 100) / 100;

        newTrans.transactionAmount = {
          amount:
            account.type === 'BANK' ? amountInCurrency : -amountInCurrency,
          currency: trans.currencyCode,
        };
        newTrans.transactionId = trans.id;
        newTrans.valueDate = newTrans.bookingDate; //always undefined?

        if (newTrans.booked) {
          booked.push(newTrans);
        } else {
          pending.push(newTrans);
        }
        all.push(newTrans);
      }

      res.send({
        status: 'ok',
        data: {
          balances,
          startingBalance,
          transactions: { all, booked, pending },
        },
      });
    } catch (error) {
      res.send({
        status: 'ok',
        data: {
          error: error.message,
        },
      });
    }
    return;
  }),
);

function getDate(date) {
  return date.toISOString().split('T')[0];
}
