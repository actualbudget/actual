import express from 'express';
import { inspect } from 'util';
import https from 'https';
import { SecretName, secretsService } from '../services/secrets-service.js';
import { handleError } from '../app-gocardless/util/handle-error.js';

const app = express();
export { app as handlers };
app.use(express.json());

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
    } catch (error) {
      invalidToken(res);
      return;
    }

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const accounts = await getAccounts(accessKey, startDate, endDate);

    res.send({
      status: 'ok',
      data: {
        accounts: accounts.accounts,
      },
    });
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

    try {
      const results = await getTransactions(accessKey, new Date(startDate));

      const account = results.accounts.find((a) => a.id === accountId);

      const needsAttention = results.errors.find(
        (e) => e === `Connection to ${account.org.name} may need attention`,
      );
      if (needsAttention) {
        res.send({
          status: 'ok',
          data: {
            error_type: 'ACCOUNT_NEEDS_ATTENTION',
            error_code: 'ACCOUNT_NEEDS_ATTENTION',
            status: 'rejected',
            reason:
              'The account needs your attention at <a href="https://beta-bridge.simplefin.org/auth/login">SimpleFIN</a>.',
          },
        });
      }

      const response = {};

      const balance = parseInt(account.balance.replace('.', ''));
      const date = new Date(account['balance-date'] * 1000)
        .toISOString()
        .split('T')[0];

      response.balances = [
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
      response.startingBalance = balance; // could be named differently in this use case.

      const allTransactions = [];
      const bookedTransactions = [];
      const pendingTransactions = [];

      for (const trans of account.transactions) {
        const newTrans = {};

        let dateToUse = 0;

        if (trans.posted == 0) {
          newTrans.booked = false;
          dateToUse = trans.transacted_at;
        } else {
          newTrans.booked = true;
          dateToUse = trans.posted;
        }

        newTrans.bookingDate = new Date(dateToUse * 1000)
          .toISOString()
          .split('T')[0];

        newTrans.date = new Date(dateToUse * 1000).toISOString().split('T')[0];
        newTrans.debtorName = trans.payee;
        //newTrans.debtorAccount = don't have compared to GoCardless
        newTrans.remittanceInformationUnstructured = trans.description;
        newTrans.transactionAmount = { amount: trans.amount, currency: 'USD' };
        newTrans.transactionId = trans.id;
        newTrans.valueDate = new Date(dateToUse * 1000)
          .toISOString()
          .split('T')[0];

        if (newTrans.booked) {
          bookedTransactions.push(newTrans);
        } else {
          pendingTransactions.push(newTrans);
        }
        allTransactions.push(newTrans);
      }

      response.transactions = {
        all: allTransactions,
        booked: bookedTransactions,
        pending: pendingTransactions,
      };

      res.send({
        status: 'ok',
        data: response,
      });
    } catch (error) {
      const sendErrorResponse = (data) =>
        res.send({ status: 'ok', data: { ...data, details: error.details } });
      console.log(
        'Something went wrong',
        inspect(error, { depth: null }),
        sendErrorResponse,
      );
    }
  }),
);

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

function parseAccessKey(accessKey) {
  let scheme = null;
  let rest = null;
  let auth = null;
  let username = null;
  let password = null;
  let baseUrl = null;
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

async function getTransactions(accessKey, startDate, endDate) {
  const now = new Date();
  startDate = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
  endDate = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 1);
  console.log(
    `${startDate.toISOString().split('T')[0]} - ${
      endDate.toISOString().split('T')[0]
    }`,
  );
  return await getAccounts(accessKey, startDate, endDate);
}

function normalizeDate(date) {
  return (date.valueOf() - date.getTimezoneOffset() * 60 * 1000) / 1000;
}

async function getAccounts(accessKey, startDate, endDate) {
  const sfin = parseAccessKey(accessKey);
  const options = {
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${sfin.username}:${sfin.password}`,
      ).toString('base64')}`,
    },
  };
  const params = [];
  let queryString = '';
  if (startDate) {
    params.push(`start-date=${normalizeDate(startDate)}`);
  }
  if (endDate) {
    params.push(`end-date=${normalizeDate(endDate)}`);
  }

  params.push(`pending=1`);

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
          resolve(JSON.parse(data));
        });
      },
    );
    req.on('error', (e) => {
      reject(e);
    });
    req.end();
  });
}
