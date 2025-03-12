import https from 'https';

import express, { Request, Response } from 'express';

import type { BankSyncTransaction } from 'loot-core/src/types/models/bank-sync.js';
import type {
  SimpleFinApiAccounts,
  SimpleFinTransactionsRequest,
} from 'loot-core/src/types/models/simplefin.js';

import { handleError } from '../app-gocardless/util/handle-error.js';
import { SecretName, secretsService } from '../services/secrets-service.js';
import { requestLoggerMiddleware } from '../util/middlewares.js';

const app = express();
export { app as handlers };
app.use(express.json());
app.use(requestLoggerMiddleware);

app.post(
  '/status',
  handleError(async (_: Request, res: Response) => {
    const token = secretsService.get(SecretName.simplefin_token);
    const configured = token != null && token !== 'Forbidden';

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
  handleError(async (_: Request, res: Response) => {
    let accessKey = secretsService.get(SecretName.simplefin_accessKey);

    try {
      if (accessKey == null || accessKey === 'Forbidden') {
        const token = secretsService.get(SecretName.simplefin_token);
        if (token == null || token === 'Forbidden') {
          throw new Error('No token');
        } else {
          accessKey = await getAccessKey(token);
          secretsService.set(SecretName.simplefin_accessKey, accessKey);
          if (accessKey == null || accessKey === 'Forbidden') {
            throw new Error('No access key');
          }
        }
      }
    } catch {
      invalidToken(res);
      return;
    }

    try {
      const accounts = await getSimplefinAccounts(
        accessKey,
        null,
        null,
        null,
        true,
      );

      res.send({
        status: 'ok',
        data: {
          accounts: accounts.accounts,
        },
      });
    } catch (e) {
      serverDown(e, res);
      return;
    }
  }),
);

app.post(
  '/transactions',
  handleError(async (req: Request, res: Response) => {
    const { accountId, startDate } = req.body as SimpleFinTransactionsRequest;

    const accessKey = secretsService.get(SecretName.simplefin_accessKey);

    if (accessKey == null || accessKey === 'Forbidden') {
      invalidToken(res);
      return;
    }

    if (Array.isArray(accountId) !== Array.isArray(startDate)) {
      console.log({ accountId, startDate });
      throw new Error(
        'accountId and startDate must either both be arrays or both be strings',
      );
    }
    if (Array.isArray(accountId) && accountId.length !== startDate.length) {
      console.log({ accountId, startDate });
      throw new Error('accountId and startDate arrays must be the same length');
    }

    const earliestStartDate = Array.isArray(startDate)
      ? startDate.reduce((a, b) => (a < b ? a : b))
      : startDate;
    let results: SimpleFinApiAccounts;
    try {
      results = await getTransactions(
        accessKey,
        Array.isArray(accountId) ? accountId : [accountId],
        new Date(earliestStartDate),
      );
    } catch (e) {
      if (e instanceof Error && e.message === 'Forbidden') {
        invalidToken(res);
      } else {
        serverDown(e, res);
      }
      return;
    }

    let response: any;
    if (Array.isArray(accountId) && Array.isArray(startDate)) {
      for (let i = 0; i < accountId.length; i++) {
        const id = accountId[i];
        response[id] = getAccountResponse(results, id, new Date(startDate[i]));
      }
    } else if (!Array.isArray(accountId) && !Array.isArray(startDate)) {
      response = getAccountResponse(results, accountId, new Date(startDate));
    }

    if (results.hasError) {
      res.send({
        status: 'ok',
        data: !Array.isArray(accountId)
          ? results.errors[accountId][0]
          : {
              ...response,
              errors: results.errors,
            },
      });
      return;
    }

    res.send({
      status: 'ok',
      data: response,
    });
  }),
);

function logAccountError(
  results: SimpleFinApiAccounts,
  accountId: string,
  errorData: any,
) {
  const errors = results.errors[accountId] || [];
  errors.push(errorData);
  results.errors[accountId] = errors;
  results.hasError = true;
}

function getAccountResponse(
  results: SimpleFinApiAccounts,
  accountId: string,
  startDate: Date,
) {
  const account = results.accounts.find(a => a.id === accountId);
  if (!account) {
    console.log(
      `The account "${accountId}" was not found. Here were the accounts returned:`,
    );
    if (results?.accounts) {
      results.accounts.forEach(a => console.log(`${a.id} - ${a.org.name}`));
    }
    logAccountError(results, accountId, {
      error_type: 'ACCOUNT_MISSING',
      error_code: 'ACCOUNT_MISSING',
      reason: `The account "${accountId}" was not found. Try unlinking and relinking the account.`,
    });
    return;
  }

  const needsAttention = results.sferrors.find(
    e => e === `Connection to ${account.org.name} may need attention`,
  );
  if (needsAttention) {
    logAccountError(results, accountId, {
      error_type: 'ACCOUNT_NEEDS_ATTENTION',
      error_code: 'ACCOUNT_NEEDS_ATTENTION',
      reason:
        'The account needs your attention at <a href="https://bridge.simplefin.org/auth/login">SimpleFIN</a>.',
    });
  }

  const startingBalance = parseInt(account.balance.replace('.', ''));
  const date = getDate(new Date(account['balance-date'] * 1000));

  const balances = [
    {
      balanceAmount: {
        amount: account.balance,
        currency: account.currency,
      },
      balanceType: 'expected',
      referenceDate: date,
    },
    {
      balanceAmount: {
        amount: account.balance,
        currency: account.currency,
      },
      balanceType: 'interimAvailable',
      referenceDate: date,
    },
  ];

  const all: BankSyncTransaction[] = [];
  const booked: BankSyncTransaction[] = [];
  const pending: BankSyncTransaction[] = [];

  for (const trans of account.transactions) {
    const isBooked = !(trans.pending ?? trans.posted === 0);
    let dateToUse = (isBooked ? trans.posted : trans.transacted_at)!;

    const transactionDate = new Date(dateToUse * 1000);

    if (transactionDate < startDate) {
      continue;
    }

    const newTrans = {
      booked: isBooked,
      sortOrder: dateToUse,
      date: getDate(transactionDate),
      payeeName: trans.payee,
      notes: trans.description,
      transactionAmount: { amount: trans.amount, currency: 'USD' },
      transactionId: trans.id,
      transactedDate:
        (trans.transacted_at &&
          getDate(new Date(trans.transacted_at * 1000))) ||
        undefined,
      postedDate:
        (trans.posted && getDate(new Date(trans.posted * 1000))) || undefined,
    } satisfies BankSyncTransaction;

    if (newTrans.booked) {
      booked.push(newTrans);
    } else {
      pending.push(newTrans);
    }
    all.push(newTrans);
  }

  const sortFunction = (a: BankSyncTransaction, b: BankSyncTransaction) =>
    b.sortOrder - a.sortOrder;

  const bookedSorted = booked.sort(sortFunction);
  const pendingSorted = pending.sort(sortFunction);
  const allSorted = all.sort(sortFunction);

  const holdings = account.holdings.map(x => ({
    holdingId: x.id,
    symbol: x.symbol,
    description: x.description,
    created: getDate(new Date(x.created * 1000)),
    currency: x.currency,
    shares: x.shares,
    purchasedUnitPrice: x.purchase_price,
    purchasedTotalPrice: x.cost_basis,
    currentUnitPrice: (
      parseFloat(x.market_value) / (parseFloat(x.shares) || 1)
    ).toFixed(2),
    currentTotalPrice: x.market_value,
  }));

  return {
    balances,
    startingBalance,
    transactions: {
      all: allSorted,
      booked: bookedSorted,
      pending: pendingSorted,
    },
    holdings,
  };
}

function invalidToken(res: Response) {
  res.send({
    status: 'ok',
    data: {
      error_type: 'INVALID_ACCESS_TOKEN',
      error_code: 'INVALID_ACCESS_TOKEN',
      status: 'rejected',
      reason:
        'Invalid SimpleFIN access token.  Reset the token and re-link any broken accounts.',
    },
  });
}

function serverDown(e: any, res: Response) {
  console.log(e);
  res.send({
    status: 'ok',
    data: {
      error_type: 'SERVER_DOWN',
      error_code: 'SERVER_DOWN',
      status: 'rejected',
      reason: 'There was an error communicating with SimpleFIN.',
    },
  });
}

function parseAccessKey(accessKey: string) {
  let scheme = null;
  let rest = null;
  let auth = null;
  let username = null;
  let password = null;
  let baseUrl = null;
  if (!accessKey || !accessKey.match(/^.*\/\/.*:.*@.*$/)) {
    console.log(`Invalid SimpleFIN access key: ${accessKey}`);
    throw new Error(`Invalid access key`);
  }
  [scheme, rest] = accessKey.split('//');
  [auth, rest] = rest.split('@');
  [username, password] = auth.split(':');
  baseUrl = `${scheme}//${rest}`;
  return {
    baseUrl,
    username,
    password,
  };
}

async function getAccessKey(base64Token: string): Promise<string> {
  const token = Buffer.from(base64Token, 'base64').toString();
  const options = {
    method: 'POST',
    port: 443,
    headers: { 'Content-Length': 0 },
  };
  return new Promise((resolve, reject) => {
    const req = https.request(new URL(token), options, res => {
      res.on('data', d => {
        resolve(d.toString());
      });
    });
    req.on('error', e => {
      reject(e);
    });
    req.end();
  });
}

async function getTransactions(
  accessKey: string,
  accounts: string[],
  startDate?: Date,
  endDate?: Date,
) {
  const now = new Date();
  startDate = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
  endDate = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 1);
  console.log(`${getDate(startDate)} - ${getDate(endDate)}`);
  return await getSimplefinAccounts(accessKey, accounts, startDate, endDate);
}

function getDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function normalizeDate(date: Date) {
  return (date.valueOf() - date.getTimezoneOffset() * 60 * 1000) / 1000;
}

async function getSimplefinAccounts(
  accessKey: string,
  accounts: string[] | null,
  startDate?: Date | null,
  endDate?: Date | null,
  noTransactions = false,
): Promise<SimpleFinApiAccounts> {
  const sfin = parseAccessKey(accessKey);
  const options = {
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${sfin.username}:${sfin.password}`,
      ).toString('base64')}`,
    },
  };
  const params: string[] = [];
  if (!noTransactions) {
    if (startDate) {
      params.push(`start-date=${normalizeDate(startDate)}`);
    }
    if (endDate) {
      params.push(`end-date=${normalizeDate(endDate)}`);
    }

    params.push(`pending=1`);
  } else {
    params.push(`balances-only=1`);
  }

  if (accounts) {
    accounts.forEach(id => {
      params.push(`account=${encodeURIComponent(id)}`);
    });
  }

  let queryString = '';
  if (params.length > 0) {
    queryString += '?' + params.join('&');
  }
  return new Promise((resolve, reject) => {
    const req = https.request(
      new URL(`${sfin.baseUrl}/accounts${queryString}`),
      options,
      res => {
        let data = '';
        res.on('data', d => {
          data += d;
        });
        res.on('end', () => {
          if (res.statusCode === 403) {
            reject(new Error('Forbidden'));
          } else {
            try {
              const results = JSON.parse(data) as SimpleFinApiAccounts;
              results.sferrors = results.errors as unknown as string[];
              results.hasError = false;
              results.errors = {};
              resolve(results);
            } catch (e) {
              console.log(`Error parsing JSON response: ${data}`);
              reject(e);
            }
          }
        });
      },
    );
    req.on('error', e => {
      reject(e);
    });
    req.end();
  });
}
