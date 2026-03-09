import express from 'express';

import { handleError } from '../app-gocardless/util/handle-error';
import { SecretName, secretsService } from '../services/secrets-service';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from '../util/middlewares';

const AKAHU_API_BASE = 'https://api.akahu.io/v1';

const app = express();
export { app as handlers };
app.use(requestLoggerMiddleware);
app.use(express.json());
app.use(validateSessionMiddleware);

app.post(
  '/status',
  handleError(async (req, res) => {
    const appToken = secretsService.get(SecretName.akahu_appToken);
    const userToken = secretsService.get(SecretName.akahu_userToken);
    const configured = Boolean(appToken && userToken);

    res.send({
      status: 'ok',
      data: { configured },
    });
  }),
);

app.post(
  '/accounts',
  handleError(async (req, res) => {
    const appToken = secretsService.get(SecretName.akahu_appToken);
    const userToken = secretsService.get(SecretName.akahu_userToken);

    if (!appToken || !userToken) {
      invalidToken(res);
      return;
    }

    try {
      const accounts = await fetchAkahuAccounts(appToken, userToken);
      res.send({ status: 'ok', data: { accounts } });
    } catch (e) {
      serverDown(e, res);
    }
  }),
);

app.post(
  '/transactions',
  handleError(async (req, res) => {
    const { accountId, startDate } = req.body || {};

    const appToken = secretsService.get(SecretName.akahu_appToken);
    const userToken = secretsService.get(SecretName.akahu_userToken);

    if (!appToken || !userToken) {
      invalidToken(res);
      return;
    }

    try {
      const result = await fetchAkahuTransactions(
        appToken,
        userToken,
        accountId,
        startDate,
      );
      res.send({ status: 'ok', data: result });
    } catch (e) {
      serverDown(e, res);
    }
  }),
);

function getAkahuHeaders(appToken, userToken) {
  return {
    Authorization: `Bearer ${userToken}`,
    'X-Akahu-Id': appToken,
    'Content-Type': 'application/json',
  };
}

async function fetchAkahuAccounts(appToken, userToken) {
  const response = await fetch(`${AKAHU_API_BASE}/accounts`, {
    headers: getAkahuHeaders(appToken, userToken),
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('Forbidden');
  }

  if (!response.ok) {
    throw new Error(`Akahu API error: ${response.status}`);
  }

  const data = await response.json();
  return data.items || [];
}

function validateAccountId(accountId) {
  // Akahu account IDs follow the format: acc_ followed by alphanumeric characters
  // Validate to prevent SSRF via path traversal or URL manipulation
  if (!accountId || !/^acc_[a-zA-Z0-9]+$/.test(accountId)) {
    throw new Error(`Invalid account ID format: ${accountId}`);
  }
}

async function fetchAkahuTransactions(
  appToken,
  userToken,
  accountId,
  startDate,
) {
  validateAccountId(accountId);
  const headers = getAkahuHeaders(appToken, userToken);

  // Fetch all transactions with cursor-based pagination
  const allTransactions = [];
  let cursor = null;

  do {
    const params = new URLSearchParams();
    if (startDate) params.set('start', new Date(startDate).toISOString());
    params.set('end', new Date().toISOString());
    if (cursor) params.set('cursor', cursor);

    const url = `${AKAHU_API_BASE}/accounts/${accountId}/transactions?${params}`;
    const response = await fetch(url, { headers });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Forbidden');
    }

    if (!response.ok) {
      throw new Error(`Akahu API error: ${response.status}`);
    }

    const data = await response.json();
    allTransactions.push(...(data.items || []));
    cursor = data.cursor?.next || null;
  } while (cursor);

  // Fetch current account balance
  const accountResponse = await fetch(
    `${AKAHU_API_BASE}/accounts/${accountId}`,
    { headers },
  );

  if (!accountResponse.ok) {
    throw new Error(`Akahu API error: ${accountResponse.status}`);
  }

  const accountData = await accountResponse.json();
  const account = accountData.item;
  const balanceCurrent = account?.balance?.current ?? 0;
  const balanceAvailable = account?.balance?.available ?? balanceCurrent;
  const currency = account?.balance?.currency ?? 'NZD';
  const balanceDate = getDate(new Date());

  // startingBalance is the current balance in integer cents
  const startingBalance = Math.round(balanceCurrent * 100);

  const balances = [
    {
      balanceAmount: {
        amount: String(balanceCurrent),
        currency,
      },
      balanceType: 'expected',
      referenceDate: balanceDate,
    },
    {
      balanceAmount: {
        amount: String(balanceAvailable),
        currency,
      },
      balanceType: 'interimAvailable',
      referenceDate: balanceDate,
    },
  ];

  // Normalize transactions into the standard bank sync format
  const booked = [];
  const all = [];

  for (const trans of allTransactions) {
    const amount = trans.amount ?? 0;
    const transDate = getDate(new Date(trans.date));
    // Prefer enriched merchant name, fall back to raw description
    const payeeName = trans.merchant?.name || trans.description || '';

    const normalized = {
      transactionId: trans._id,
      date: transDate,
      payeeName,
      notes: trans.description,
      transactionAmount: {
        amount: String(amount),
        currency,
      },
      booked: true,
      sortOrder: new Date(trans.date).getTime(),
    };

    booked.push(normalized);
    all.push(normalized);
  }

  const sortFn = (a, b) => b.sortOrder - a.sortOrder;

  return {
    balances,
    startingBalance,
    transactions: {
      all: all.sort(sortFn),
      booked: booked.sort(sortFn),
      pending: [],
    },
  };
}

function getDate(date) {
  return date.toISOString().split('T')[0];
}

function invalidToken(res) {
  res.send({
    status: 'ok',
    data: {
      error_type: 'INVALID_ACCESS_TOKEN',
      error_code: 'INVALID_ACCESS_TOKEN',
      status: 'rejected',
      reason:
        'Invalid Akahu credentials. Please re-enter your App Token and User Token.',
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
      reason: 'There was an error communicating with Akahu.',
    },
  });
}
