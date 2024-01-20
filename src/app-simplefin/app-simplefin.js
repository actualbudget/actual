import express from 'express';
import { inspect } from 'util';
import https from 'https';
import { SecretName, secretsService } from '../services/secrets-service.js';

const app = express();
export { app as handlers };
app.use(express.json());

app.post('/status', async (req, res) => {
  let configured = false;

  let token = secretsService.get(SecretName.simplefin_token);
  if (token != null && token !== 'Forbidden') {
    configured = true;
  }

  res.send({
    status: 'ok',
    data: {
      configured: configured,
    },
  });
});

app.post('/accounts', async (req, res) => {
  let accessKey = secretsService.get(SecretName.simplefin_accessKey);

  if (accessKey == null || accessKey === 'Forbidden') {
    let token = secretsService.get(SecretName.simplefin_token);
    if (token == null || token === 'Forbidden') {
      return;
    } else {
      accessKey = await getAccessKey(token);
      secretsService.set(SecretName.simplefin_accessKey, accessKey);
    }
  }

  const now = new Date();
  let startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  let accounts = await getAccounts(accessKey, startDate, endDate);

  res.send({
    status: 'ok',
    data: {
      accounts: accounts.accounts,
    },
  });
});

app.post('/transactions', async (req, res) => {
  const { accountId, startDate } = req.body;

  let accessKey = secretsService.get(SecretName.simplefin_accessKey);

  if (accessKey == null || accessKey === 'Forbidden') {
    return;
  }

  try {
    let results = await getTransactions(accessKey, new Date(startDate));

    let account = results.accounts.find((a) => a.id === accountId);

    let response = {};

    let balance = parseInt(account.balance.replace('.', ''));
    let date = new Date(account['balance-date'] * 1000)
      .toISOString()
      .split('T')[0];

    response.balances = [
      {
        balanceAmount: { amount: account.balance, currency: account.currency },
        balanceType: 'expected',
        referenceDate: date,
      },
      {
        balanceAmount: { amount: account.balance, currency: account.currency },
        balanceType: 'interimAvailable',
        referenceDate: date,
      },
    ];
    //response.iban = don't have compared to GoCardless
    //response.institutionId = don't have compared to GoCardless
    response.startingBalance = balance; // could be named differently in this use case.

    let allTransactions = [];

    for (let trans of account.transactions) {
      let newTrans = {};

      //newTrans.bankTransactionCode = don't have compared to GoCardless
      newTrans.booked = true;
      newTrans.bookingDate = new Date(trans.posted * 1000)
        .toISOString()
        .split('T')[0];
      newTrans.date = new Date(trans.posted * 1000).toISOString().split('T')[0];
      newTrans.debtorName = trans.payee;
      //newTrans.debtorAccount = don't have compared to GoCardless
      newTrans.remittanceInformationUnstructured = trans.description;
      newTrans.transactionAmount = { amount: trans.amount, currency: 'USD' };
      newTrans.transactionId = trans.id;
      newTrans.valueDate = new Date(trans.posted * 1000)
        .toISOString()
        .split('T')[0];

      allTransactions.push(newTrans);
    }

    response.transactions = {
      all: allTransactions,
      booked: allTransactions,
      pending: [],
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
});

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
