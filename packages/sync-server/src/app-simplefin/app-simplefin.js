import express from 'express';
import https from 'https';
import { SecretName, secretsService } from '../services/secrets-service.js';
import { handleError } from '../app-gocardless/util/handle-error.js';
import { requestLoggerMiddleware } from '../util/middlewares.js';

const app = express();
export { app as handlers };
app.use(express.json());
app.use(requestLoggerMiddleware);

app.post(
  '/status',
  handleError(async (req, res) => {
    const token = secretsService.get(SecretName.simplefin_token);
    const configured = token != null && token !== 'Forbidden';

    res.send({
      status: 'ok',
      data: {
        configured: configured,
      },
    });
  }),
);

app.post(
  '/accounts',
  handleError(async (req, res) => {
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
      const accounts = await getAccounts(accessKey, null, null, null, true);

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
  handleError(async (req, res) => {
    const { accountId, startDate } = req.body;

    const accessKey = secretsService.get(SecretName.simplefin_accessKey);

    if (accessKey == null || accessKey === 'Forbidden') {
      invalidToken(res);
      return;
    }

    if (Array.isArray(accountId) != Array.isArray(startDate)) {
      console.log(accountId, startDate);
      throw new Error(
        'accountId and startDate must either both be arrays or both be strings',
      );
    }
    if (Array.isArray(accountId) && accountId.length !== startDate.length) {
      console.log(accountId, startDate);
      throw new Error('accountId and startDate arrays must be the same length');
    }

    const earliestStartDate = Array.isArray(startDate)
      ? startDate.reduce((a, b) => (a < b ? a : b))
      : startDate;
    let results;
    try {
      results = await getTransactions(
        accessKey,
        Array.isArray(accountId) ? accountId : [accountId],
        new Date(earliestStartDate),
      );
    } catch (e) {
      if (e.message === 'Forbidden') {
        invalidToken(res);
      } else {
        serverDown(e, res);
      }
      return;
    }

    let response = {};
    if (Array.isArray(accountId)) {
      for (let i = 0; i < accountId.length; i++) {
        const id = accountId[i];
        response[id] = getAccountResponse(results, id, new Date(startDate[i]));
      }
    } else {
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

function logAccountError(results, accountId, data) {
  const errors = results.errors[accountId] || [];
  errors.push(data);
  results.errors[accountId] = errors;
  results.hasError = true;
}

function getAccountResponse(results, accountId, startDate) {
  const account =
    !results?.accounts || results.accounts.find((a) => a.id === accountId);
  if (!account) {
    console.log(
      `The account "${accountId}" was not found. Here were the accounts returned:`,
    );
    if (results?.accounts)
      results.accounts.forEach((a) => console.log(`${a.id} - ${a.org.name}`));
    logAccountError(results, accountId, {
      error_type: 'ACCOUNT_MISSING',
      error_code: 'ACCOUNT_MISSING',
      reason: `The account "${accountId}" was not found. Try unlinking and relinking the account.`,
    });
    return;
  }

  const needsAttention = results.sferrors.find(
    (e) => e === `Connection to ${account.org.name} may need attention`,
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

  const all = [];
  const booked = [];
  const pending = [];

  for (const trans of account.transactions) {
    const newTrans = {};

    let dateToUse = 0;

    if (trans.pending ?? trans.posted == 0) {
      newTrans.booked = false;
      dateToUse = trans.transacted_at;
    } else {
      newTrans.booked = true;
      dateToUse = trans.posted;
    }

    const transactionDate = new Date(dateToUse * 1000);

    if (transactionDate < startDate) {
      continue;
    }

    newTrans.date = getDate(transactionDate);
    newTrans.payeeName = trans.payee;
    newTrans.remittanceInformationUnstructured = trans.description;
    newTrans.transactionAmount = { amount: trans.amount, currency: 'USD' };
    newTrans.transactionId = trans.id;
    newTrans.valueDate = newTrans.bookingDate;

    if (newTrans.booked) {
      booked.push(newTrans);
    } else {
      pending.push(newTrans);
    }
    all.push(newTrans);
  }

  return { balances, startingBalance, transactions: { all, booked, pending } };
}

function invalidToken(res) {
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

function serverDown(e, res) {
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

function parseAccessKey(accessKey) {
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
    baseUrl: baseUrl,
    username: username,
    password: password,
  };
}

async function getAccessKey(base64Token) {
  const token = Buffer.from(base64Token, 'base64').toString();
  const options = {
    method: 'POST',
    port: 443,
    headers: { 'Content-Length': 0 },
  };
  return new Promise((resolve, reject) => {
    const req = https.request(new URL(token), options, (res) => {
      res.on('data', (d) => {
        resolve(d.toString());
      });
    });
    req.on('error', (e) => {
      reject(e);
    });
    req.end();
  });
}

async function getTransactions(accessKey, accounts, startDate, endDate) {
  const now = new Date();
  startDate = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
  endDate = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 1);
  console.log(`${getDate(startDate)} - ${getDate(endDate)}`);
  return await getAccounts(accessKey, accounts, startDate, endDate);
}

function getDate(date) {
  return date.toISOString().split('T')[0];
}

function normalizeDate(date) {
  return (date.valueOf() - date.getTimezoneOffset() * 60 * 1000) / 1000;
}

async function getAccounts(
  accessKey,
  accounts,
  startDate,
  endDate,
  noTransactions = false,
) {
  const sfin = parseAccessKey(accessKey);
  const options = {
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${sfin.username}:${sfin.password}`,
      ).toString('base64')}`,
    },
  };
  const params = [];
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
    accounts.forEach((id) => {
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
      (res) => {
        let data = '';
        res.on('data', (d) => {
          data += d;
        });
        res.on('end', () => {
          if (res.statusCode === 403) {
            reject(new Error('Forbidden'));
          } else {
            try {
              const results = JSON.parse(data);
              results.sferrors = results.errors;
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
    req.on('error', (e) => {
      reject(e);
    });
    req.end();
  });
}
