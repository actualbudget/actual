import { AkahuClient } from 'akahu';
import express from 'express';

import { handleError } from '../app-gocardless/util/handle-error.js';
import { SecretName, secretsService } from '../services/secrets-service.js';
import { requestLoggerMiddleware } from '../util/middlewares.js';

const ACCOUNT_TYPES = Object.freeze({
  CREDIT_CARD: 'CREDITCARD',
  LOAN: 'LOAN',
});

const TRANSFER_PATTERNS = Object.freeze({
  TO: / TFR TO /,
  FROM: / TFR FROM /,
});

const TRANSFER_REGEX = Object.freeze({
  TO_DESCRIPTION: /(.+) TFR TO .+/,
  FROM_DESCRIPTION: /(.+) TFR FROM .+/,
  TO_PAYEE: /.+ TFR TO (.+)/,
  FROM_PAYEE: /.+ TFR FROM (.+)/,
});

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
        status: 'error',
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

    if (!accountId || !startDate) {
      return res.send({
        status: 'error',
        data: {
          error: 'accountId and startDate are required',
        },
      });
    }

    try {
      const userToken = secretsService.get(SecretName.akahu_userToken);
      const appToken = secretsService.get(SecretName.akahu_appToken);
      const akahu = new AkahuClient({ appToken });

      const account = await akahu.accounts.get(userToken, accountId);
      if (!account) {
        return res.send({
          status: 'error',
          data: {
            error: 'Account not found',
          },
        });
      }

      let currentBalance = convertToCents(account.balance.current);
      const availableBalance = convertToCents(account.balance.available);

      if (
        [ACCOUNT_TYPES.CREDIT_CARD, ACCOUNT_TYPES.LOAN].includes(account.type)
      ) {
        currentBalance = -currentBalance;
      }

      const now = new Date();
      const endDate = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1,
      ).toISOString();

      // Fetch all transactions using pagination
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
            amount: currentBalance,
            currency: account.balance.currency,
          },
          balanceType: 'expected',
          referenceDate: date,
        },
        {
          balanceAmount: {
            amount: availableBalance,
            currency: account.balance.currency,
          },
          balanceType: 'interimAvailable',
          referenceDate: date,
        },
      ];

      const startDateObj = new Date(startDate);
      const all = [];
      const booked = [];
      const pending = [];

      // Process booked transactions
      for (const trans of transactions) {
        if (new Date(trans.date) >= startDateObj) {
          const processedTrans = processTransaction(trans, account, true);
          booked.push(processedTrans);
          all.push(processedTrans);
        }
      }

      // Process pending transactions
      for (const trans of pendingTransactions) {
        if (new Date(trans.date) >= startDateObj) {
          const processedTrans = processTransaction(trans, account, false);
          pending.push(processedTrans);
          all.push(processedTrans);
        }
      }

      const sortFunction = (a, b) => b.sortOrder - a.sortOrder;
      const bookedSorted = booked.sort(sortFunction);
      const pendingSorted = pending.sort(sortFunction);
      const allSorted = all.sort(sortFunction);

      res.send({
        status: 'ok',
        data: {
          balances,
          startingBalance: currentBalance,
          transactions: {
            all: allSorted,
            booked: bookedSorted,
            pending: pendingSorted,
          },
        },
      });
    } catch (error) {
      res.send({
        status: 'error',
        data: {
          error: 'Failed to fetch transactions: ' + error.message,
        },
      });
    }
  }),
);

function getDate(date) {
  return date.toISOString().split('T')[0];
}

function convertToCents(amount) {
  return parseInt(Math.round(amount * 100).toString());
}

function extractRegexMatch(text, regex) {
  const matches = text.match(regex);
  return matches && matches.length > 1 ? matches[1] : null;
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
  if (trans.description.match(TRANSFER_PATTERNS.TO)) {
    const note = extractRegexMatch(
      trans.description,
      TRANSFER_REGEX.TO_DESCRIPTION,
    );
    if (note) return note;
  }

  if (trans.description.match(TRANSFER_PATTERNS.FROM)) {
    const note = extractRegexMatch(
      trans.description,
      TRANSFER_REGEX.FROM_DESCRIPTION,
    );
    if (note) return note;
  }

  return trans.description;
}

function getPayeeName(trans) {
  if (trans.merchant?.name) {
    return trans.merchant.name;
  }

  if (trans.meta?.other_account) {
    return trans.meta.other_account;
  }

  if (trans.description.match(TRANSFER_PATTERNS.TO)) {
    const payee = extractRegexMatch(trans.description, TRANSFER_REGEX.TO_PAYEE);
    if (payee) return payee;
  }

  if (trans.description.match(TRANSFER_PATTERNS.FROM)) {
    const payee = extractRegexMatch(
      trans.description,
      TRANSFER_REGEX.FROM_PAYEE,
    );
    if (payee) return payee;
  }

  return '';
}

function processTransaction(trans, account, isBooked = true) {
  const transactionDate = new Date(trans.date);

  const newTrans = {
    booked: isBooked,
    date: getDate(transactionDate),
    payeeName: getPayeeName(trans),
    notes: normalizeNotes(trans),
    transactionId: trans._id,
    sortOrder: transactionDate.getTime(),
  };

  let amount = trans.amount;
  if ([ACCOUNT_TYPES.CREDIT_CARD, ACCOUNT_TYPES.LOAN].includes(account.type)) {
    amount *= -1;
  }

  newTrans.transactionAmount = {
    amount: Math.round(amount * 100) / 100,
    currency: account.balance.currency,
  };

  delete trans.amount;
  return { ...flattenObject(trans), ...newTrans };
}
