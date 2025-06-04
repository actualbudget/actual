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
    const { accountId, startDate } = req.body || {};

    try {
      const transactions = await pluggyaiService.getTransactions(
        accountId,
        startDate,
      );

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
      ];

      const all = [];
      const booked = [];
      const pending = [];

      for (const trans of transactions) {
        const newTrans = {};

        newTrans.booked = !(trans.status === 'PENDING');

        const transactionDate = new Date(trans.date);

        if (transactionDate < startDate && !trans.sandbox) {
          continue;
        }

        newTrans.date = getDate(transactionDate);
        newTrans.payeeName = getPayeeName(trans);
        newTrans.notes = trans.descriptionRaw || trans.description;

        if (account.type === 'CREDIT') {
          if (trans.amountInAccountCurrency) {
            trans.amountInAccountCurrency *= -1;
          }

          trans.amount *= -1;
        }

        let amountInCurrency = trans.amountInAccountCurrency ?? trans.amount;
        amountInCurrency = Math.round(amountInCurrency * 100) / 100;

        newTrans.transactionAmount = {
          amount: amountInCurrency,
          currency: trans.currencyCode,
        };

        newTrans.transactionId = trans.id;
        newTrans.sortOrder = transactionDate.getTime();

        delete trans.amount;

        const finalTrans = { ...flattenObject(trans), ...newTrans };
        if (newTrans.booked) {
          booked.push(finalTrans);
        } else {
          pending.push(finalTrans);
        }
        all.push(finalTrans);
      }

      const sortFunction = (a, b) => b.sortOrder - a.sortOrder;

      const bookedSorted = booked.sort(sortFunction);
      const pendingSorted = pending.sort(sortFunction);
      const allSorted = all.sort(sortFunction);

      res.send({
        status: 'ok',
        data: {
          balances,
          startingBalance,
          transactions: {
            all: allSorted,
            booked: bookedSorted,
            pending: pendingSorted,
          },
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

function flattenObject(obj, prefix = '') {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value === null) {
      continue;
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

function getPayeeName(trans) {
  if (trans.merchant && (trans.merchant.name || trans.merchant.businessName)) {
    return trans.merchant.name || trans.merchant.businessName || '';
  }

  if (trans.paymentData) {
    const { receiver, payer } = trans.paymentData;

    if (trans.type === 'DEBIT' && receiver) {
      return receiver.name || receiver.documentNumber?.value || '';
    }

    if (trans.type === 'CREDIT' && payer) {
      return payer.name || payer.documentNumber?.value || '';
    }
  }

  return '';
}
