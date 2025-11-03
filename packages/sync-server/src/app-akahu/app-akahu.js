import { AkahuClient } from 'akahu';
import express from 'express';

import { handleError } from '../app-gocardless/util/handle-error.js';
import { SecretName, secretsService } from '../services/secrets-service.js';
import { requestLoggerMiddleware } from '../util/middlewares.js';

const app = express();
export { app as handlers };
app.use(express.json());
app.use(requestLoggerMiddleware);

app.post(
  '/status',
  handleError(async (req, res) => {
    const userToken = secretsService.get(SecretName.akahu_userToken);
    const token = secretsService.get(SecretName.akahu_appToken);
    const configured = userToken != null && token != null;

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
    const userToken = secretsService.get(SecretName.akahu_userToken);
    const appToken = secretsService.get(SecretName.akahu_appToken);

    try {
      const akahu = new AkahuClient({ appToken });
      const accounts = await akahu.accounts.list(userToken);

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
      const userToken = secretsService.get(SecretName.akahu_userToken);
      const appToken = secretsService.get(SecretName.akahu_appToken);
      const akahu = new AkahuClient({ appToken });

      const account = await akahu.accounts.get(userToken, accountId);

      let startingBalance = parseInt(
        Math.round(account.balance.current * 100).toString(),
      );

      if (['CREDITCARD', 'LOAN'].includes(account.type)) {
        startingBalance = -startingBalance;
      }

      const now = new Date();
      const endDate = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1,
      ).toISOString();

      const transactions = [];
      let cursor = undefined;

      do {
        const { items, cursor: nextCursor } =
          await akahu.accounts.listTransactions(userToken, accountId, {
            start: new Date(startDate).toISOString(),
            end: endDate,
            cursor,
          });

        transactions.push(...items);
        cursor = nextCursor && nextCursor.next ? nextCursor.next : undefined;
      } while (cursor);

      const pendingTransactions = await akahu.accounts.listPendingTransactions(
        userToken,
        accountId,
      );

      const date = getDate(new Date(account.refreshed.balance));

      const balances = [
        {
          balanceAmount: {
            amount: startingBalance,
            currency: account.balance.currency,
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

        newTrans.booked = true;

        const transactionDate = new Date(trans.date);

        if (transactionDate < startDate) {
          continue;
        }

        newTrans.date = getDate(transactionDate);
        newTrans.payeeName = getPayeeName(trans);
        newTrans.notes = normalizeNotes(trans.description);

        if (['CREDITCARD', 'LOAN'].includes(account.type)) {
          trans.amount *= -1;
        }

        let amount = trans.amount;
        amount = Math.round(amount * 100) / 100;

        newTrans.transactionAmount = {
          amount,
          currency: account.balance.currency,
        };

        newTrans.transactionId = trans._id;
        newTrans.sortOrder = transactionDate.getTime();

        delete trans.amount;

        const finalTrans = { ...flattenObject(trans), ...newTrans };

        booked.push(finalTrans);
        all.push(finalTrans);
      }

      for (const trans of pendingTransactions) {
        const newTrans = {};

        newTrans.booked = false;

        const transactionDate = new Date(trans.date);

        if (transactionDate < startDate) {
          continue;
        }

        newTrans.date = getDate(transactionDate);
        newTrans.payeeName = getPayeeName(trans);
        newTrans.notes = normalizeNotes(trans.description);

        if (['CREDITCARD', 'LOAN'].includes(account.type)) {
          trans.amount *= -1;
        }

        let amount = trans.amount;
        amount = Math.round(amount * 100) / 100;

        newTrans.transactionAmount = {
          amount,
          currency: account.balance.currency,
        };

        newTrans.transactionId = trans._id;
        newTrans.sortOrder = transactionDate.getTime();

        delete trans.amount;

        const finalTrans = { ...flattenObject(trans), ...newTrans };

        pending.push(finalTrans);
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

function normalizeNotes(trans) {
  if (trans.description.includes(' TFR TO ')) {
    const regex = /(.+) TFR TO .+/;
    const matches = trans.description.match(regex);
    if (matches && matches.length > 1 && matches[1]) {
      return matches[1];
    }
  }

  if (trans.description.includes(' TFR FROM ')) {
    const regex = /(.+) TFR FROM .+/;
    const matches = trans.description.match(regex);
    if (matches && matches.length > 1 && matches[1]) {
      return matches[1];
    }
  }

  return trans.description;
}

function getPayeeName(trans) {
  if (trans.merchant && trans.merchant.name) {
    return trans.merchant.name || '';
  }

  if (trans.meta) {
    if (trans.meta.other_account) {
      return trans.meta.other_account || '';
    }
  }

  if (trans.description.includes(' TFR TO ')) {
    const regex = /.+ TFR TO (.+)/;
    const matches = trans.description.match(regex);
    if (matches && matches.length > 1 && matches[1]) {
      return matches[1];
    }
  }

  if (trans.description.includes(' TFR FROM ')) {
    const regex = /.+ TFR FROM (.+)/;
    const matches = trans.description.match(regex);
    if (matches && matches.length > 1 && matches[1]) {
      return matches[1];
    }
  }

  return '';
}
