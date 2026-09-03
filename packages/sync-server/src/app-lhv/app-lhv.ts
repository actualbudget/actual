import express from 'express';

import { isAdmin } from '#account-db';
import { handleError } from '#app-gocardless/util/handle-error';
import { SecretName, secretsService } from '#services/secrets-service';
import * as UserService from '#services/user-service';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from '#util/middlewares';
import { isValidFileId } from '#util/paths';

const app = express();
export { app as handlers };
app.use(requestLoggerMiddleware);
app.use(express.json());
app.use(validateSessionMiddleware);

const LHV_AUTH_URL = 'https://auth.lhv.ai/oauth2/token';
const LHV_API_BASE_URL = 'https://api.lhv.ai/api/v1';
const LHV_CLIENT_ID = 'api-access';
const LHV_STATEMENT_LIMIT = 50;
const accessTokenCache = new Map<
  string,
  { accessToken: string; refreshToken: string; expiresAt: number }
>();
const accessTokenRefreshes = new Map<string, Promise<string>>();

class InvalidAccessTokenError extends Error {}
class AccountMissingError extends Error {}
class PaginationOverflowError extends Error {}

function canAccessFile(fileId: string, userId: string) {
  return isAdmin(userId) || UserService.countUserAccess(fileId, userId) > 0;
}

function sendMissingFileId(res: express.Response) {
  res.status(400).send({
    status: 'error',
    reason: 'missing-file-id',
    details: 'LHV.ai requires a budget file ID',
  });
}

function getAuthorizedFileId(req: express.Request, res: express.Response) {
  const fileId = req.get('X-Actual-File-Id');

  if (!fileId) {
    sendMissingFileId(res);
    return null;
  }

  if (!isValidFileId(fileId)) {
    res.status(400).send({
      status: 'error',
      reason: 'invalid-file-id',
      details: 'invalid fileId',
    });
    return null;
  }

  if (!canAccessFile(fileId, res.locals.user_id)) {
    res.status(403).send({
      status: 'error',
      reason: 'file-access-denied',
      details: "You don't have permissions over this file",
    });
    return null;
  }

  return fileId;
}

app.post(
  '/status',
  handleError(async (req, res) => {
    const fileId = getAuthorizedFileId(req, res);
    if (!fileId) {
      return;
    }

    res.send({
      status: 'ok',
      data: {
        configured: secretsService.exists(SecretName.lhv_refreshToken, fileId),
        source: 'per-budget-file',
      },
    });
  }),
);

app.post(
  '/accounts',
  handleError(async (req, res) => {
    const fileId = getAuthorizedFileId(req, res);
    if (!fileId) {
      return;
    }

    try {
      const accounts = await getAccounts(fileId);

      res.send({
        status: 'ok',
        data: {
          accounts: accounts.map(account => ({
            account_id: account.iban,
            balance: Number(account.availableBalance),
            institution: 'LHV',
            name: account.name,
            orgDomain: 'lhv.ee',
            orgId: 'lhv',
          })),
        },
      });
    } catch (error) {
      if (error instanceof InvalidAccessTokenError) {
        invalidToken(res);
        return;
      }

      serverDown(error, res);
    }
  }),
);

app.post(
  '/transactions',
  handleError(async (req, res) => {
    const fileId = getAuthorizedFileId(req, res);
    if (!fileId) {
      return;
    }

    const { accountId, startDate } = req.body || {};
    if (typeof accountId !== 'string' || typeof startDate !== 'string') {
      res.status(400).send({
        status: 'error',
        reason: 'invalid-request',
        details: 'accountId and startDate are required',
      });
      return;
    }

    try {
      const account = await getAccount(fileId, accountId);
      const response = await getTransactionsForRange(
        fileId,
        account.iban,
        startDate,
        getDate(new Date()),
      );
      const balances = normalizeBalances(
        response.balances,
        account.currency,
        account.availableBalance,
        getDate(new Date()),
      );

      res.send({
        status: 'ok',
        data: {
          balances,
          startingBalance: getStartingBalance(balances, account),
          transactions: {
            all: response.transactions,
            booked: response.transactions,
            pending: [],
          },
        },
      });
    } catch (error) {
      if (error instanceof InvalidAccessTokenError) {
        invalidToken(res);
        return;
      }

      if (error instanceof AccountMissingError) {
        res.send({
          status: 'ok',
          data: {
            error_type: 'ACCOUNT_MISSING',
            error_code: 'ACCOUNT_MISSING',
            reason: `The account "${accountId}" was not found. Try unlinking and relinking the account.`,
          },
        });
        return;
      }

      if (error instanceof PaginationOverflowError) {
        res.send({
          status: 'ok',
          data: {
            error_type: 'PAGE_LIMIT_EXCEEDED',
            error_code: 'PAGE_LIMIT_EXCEEDED',
            reason:
              'LHV.ai returned too many booked transactions for a single day. Narrow the import window and try again.',
          },
        });
        return;
      }

      serverDown(error, res);
    }
  }),
);

async function getAccounts(fileId: string) {
  const response = await fetchJsonWithAccessToken(
    `${LHV_API_BASE_URL}/accounts`,
    {
      fileId,
    },
  );

  const accounts: unknown[] = Array.isArray(response)
    ? response
    : Array.isArray(response?.accounts)
      ? response.accounts
      : [];

  return accounts
    .filter(
      (account): account is Record<string, unknown> =>
        account !== null &&
        typeof account === 'object' &&
        'iban' in account &&
        typeof account.iban === 'string' &&
        account.iban !== '',
    )
    .map(account => ({
      iban: String(account.iban),
      name: String(account.name ?? account.iban),
      currency: String(account.currency ?? 'EUR'),
      availableBalance: account.availableBalance,
    }));
}

async function getAccount(fileId: string, iban: string) {
  const account = (await getAccounts(fileId)).find(a => a.iban === iban);

  if (!account) {
    throw new AccountMissingError();
  }

  return account;
}

async function getTransactionsForRange(
  fileId: string,
  iban: string,
  dateFrom: string,
  dateTo: string,
): Promise<{
  transactions: Array<Record<string, unknown>>;
  balances: unknown[];
}> {
  const response = await fetchStatement(fileId, iban, dateFrom, dateTo);

  if (!response?.hasMore) {
    return {
      transactions: mapTransactions(iban, response?.transactions),
      balances: Array.isArray(response?.balances) ? response.balances : [],
    };
  }

  if (dateFrom === dateTo) {
    throw new PaginationOverflowError();
  }

  const midpoint = getMidpointDate(dateFrom, dateTo);
  const nextDate = getDate(addDays(parseDate(midpoint), 1));

  const [left, right] = await Promise.all([
    getTransactionsForRange(fileId, iban, dateFrom, midpoint),
    getTransactionsForRange(fileId, iban, nextDate, dateTo),
  ]);

  return {
    transactions: [...left.transactions, ...right.transactions].sort(
      sortTransactionsDescending,
    ),
    balances: right.balances.length > 0 ? right.balances : left.balances,
  };
}

async function fetchStatement(
  fileId: string,
  iban: string,
  dateFrom: string,
  dateTo: string,
) {
  const params = new URLSearchParams({
    dateFrom,
    dateTo,
    limit: String(LHV_STATEMENT_LIMIT),
    includeReservations: 'false',
    includeBalances: 'true',
  });

  return fetchJsonWithAccessToken(
    `${LHV_API_BASE_URL}/accounts/${encodeURIComponent(iban)}/statement?${params.toString()}`,
    { fileId },
  );
}

async function fetchJsonWithAccessToken(
  url: string,
  {
    fileId,
    retryOnUnauthorized = true,
  }: { fileId: string; retryOnUnauthorized?: boolean },
) {
  const accessToken = await getAccessToken(fileId);
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (
    (response.status === 401 || response.status === 403) &&
    retryOnUnauthorized
  ) {
    accessTokenCache.delete(fileId);
    await refreshAccessTokenOnce(fileId);
    return fetchJsonWithAccessToken(url, {
      fileId,
      retryOnUnauthorized: false,
    });
  }

  if (response.status === 401 || response.status === 403) {
    accessTokenCache.delete(fileId);
    throw new InvalidAccessTokenError();
  }

  if (!response.ok) {
    throw new Error(`LHV.ai request failed with HTTP ${response.status}`);
  }

  return parseJsonResponse(response);
}

async function getAccessToken(fileId: string) {
  const refreshToken = secretsService.get(SecretName.lhv_refreshToken, fileId);
  const cached = accessTokenCache.get(fileId);
  if (
    cached &&
    cached.refreshToken === refreshToken &&
    cached.expiresAt > Date.now()
  ) {
    return cached.accessToken;
  }

  return refreshAccessTokenOnce(fileId);
}

function refreshAccessTokenOnce(fileId: string) {
  const pendingRefresh = accessTokenRefreshes.get(fileId);
  if (pendingRefresh) {
    return pendingRefresh;
  }

  const refresh = refreshAccessToken(fileId).finally(() => {
    if (accessTokenRefreshes.get(fileId) === refresh) {
      accessTokenRefreshes.delete(fileId);
    }
  });
  accessTokenRefreshes.set(fileId, refresh);
  return refresh;
}

async function refreshAccessToken(fileId: string) {
  const refreshToken = secretsService
    .get(SecretName.lhv_refreshToken, fileId)
    ?.trim();

  if (!refreshToken) {
    throw new InvalidAccessTokenError();
  }

  const response = await fetch(LHV_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: LHV_CLIENT_ID,
    }),
  });

  if (
    response.status === 400 ||
    response.status === 401 ||
    response.status === 403
  ) {
    accessTokenCache.delete(fileId);
    throw new InvalidAccessTokenError();
  }

  if (!response.ok) {
    throw new Error(`LHV.ai token refresh failed with HTTP ${response.status}`);
  }

  const data = await parseJsonResponse(response);
  const accessToken = data?.access_token;
  const rotatedRefreshToken = data?.refresh_token;

  if (typeof accessToken !== 'string' || accessToken.trim() === '') {
    throw new Error('LHV.ai token refresh did not return an access token');
  }

  if (
    typeof rotatedRefreshToken === 'string' &&
    rotatedRefreshToken.trim() !== ''
  ) {
    secretsService.set(
      SecretName.lhv_refreshToken,
      rotatedRefreshToken,
      fileId,
    );
  }

  const currentRefreshToken =
    typeof rotatedRefreshToken === 'string' && rotatedRefreshToken.trim() !== ''
      ? rotatedRefreshToken
      : refreshToken;
  accessTokenCache.set(fileId, {
    accessToken,
    refreshToken: currentRefreshToken,
    expiresAt: Date.now() + 55 * 60 * 1000,
  });
  return accessToken;
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function mapTransactions(iban: string, transactions: unknown) {
  if (!Array.isArray(transactions)) {
    return [];
  }

  return transactions
    .filter(tx => tx && typeof tx === 'object')
    .filter(tx => isBookedTransaction(tx))
    .map(tx => mapTransaction(iban, tx))
    .sort(sortTransactionsDescending);
}

function isBookedTransaction(tx: Record<string, unknown>) {
  if ('booked' in tx) {
    return Boolean(tx.booked);
  }

  const status = String(tx.status ?? tx.transactionStatus ?? '').toUpperCase();
  return status === '' || status === 'BOOKED' || status === 'BOOK';
}

function mapTransaction(iban: string, tx: Record<string, unknown>) {
  const settlementDateTime = String(
    tx.settlementDtime ?? tx.bookingDate ?? tx.valueDate ?? '',
  );
  const description = String(tx.description ?? '').trim();
  const payeeName = getCounterpartyName(tx, description);
  const amount = tx.amount;
  const currency = tx.currency ?? tx.accountCurrency;
  const bankReference = String(
    tx.bankReference ?? tx.transactionId ?? tx.id ?? '',
  );

  if (
    !bankReference ||
    !settlementDateTime ||
    !Number.isFinite(Number(amount)) ||
    typeof currency !== 'string'
  ) {
    throw new Error('LHV.ai returned an invalid booked transaction');
  }

  return {
    settlementDtime: settlementDateTime,
    booked: true,
    date: getDateFromTimestamp(settlementDateTime),
    postedDate: getDateFromTimestamp(settlementDateTime),
    valueDate: getDateFromTimestamp(settlementDateTime),
    payeeName,
    notes: description || undefined,
    sortOrder: Date.parse(settlementDateTime) || 0,
    transactionAmount: {
      amount: typeof amount === 'string' ? amount : String(amount ?? ''),
      currency: typeof currency === 'string' ? currency : undefined,
    },
    transactionId: `${iban}:${bankReference}`,
  };
}

function getCounterpartyName(tx: Record<string, unknown>, description: string) {
  const paymentData =
    tx.paymentData && typeof tx.paymentData === 'object'
      ? (tx.paymentData as Record<string, unknown>)
      : null;

  if (!paymentData) {
    return description || undefined;
  }

  const direction = String(
    tx.direction ?? tx.creditDebitIndicator ?? '',
  ).toUpperCase();
  const counterparty =
    paymentData.counterparty && typeof paymentData.counterparty === 'object'
      ? (paymentData.counterparty as Record<string, unknown>)
      : null;

  const creditor =
    paymentData.creditor && typeof paymentData.creditor === 'object'
      ? (paymentData.creditor as Record<string, unknown>)
      : null;
  const debtor =
    paymentData.debtor && typeof paymentData.debtor === 'object'
      ? (paymentData.debtor as Record<string, unknown>)
      : null;
  const debitName =
    stringOrNull(creditor?.name) ??
    stringOrNull(paymentData.creditorName) ??
    stringOrNull(counterparty?.creditorName) ??
    stringOrNull(counterparty?.name);
  const creditName =
    stringOrNull(debtor?.name) ??
    stringOrNull(paymentData.debtorName) ??
    stringOrNull(counterparty?.debtorName) ??
    stringOrNull(counterparty?.name);

  if (direction === 'DEBIT') {
    return debitName ?? (description || undefined);
  }

  if (direction === 'CREDIT') {
    return creditName ?? (description || undefined);
  }

  return stringOrNull(counterparty?.name) ?? (description || undefined);
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function normalizeBalances(
  balances: unknown[],
  fallbackCurrency: string,
  fallbackAmount: unknown,
  fallbackDate: string,
) {
  if (Array.isArray(balances) && balances.length > 0) {
    return balances
      .map(balance => normalizeBalance(balance, fallbackCurrency, fallbackDate))
      .filter(balance => balance !== null);
  }

  return [
    {
      balanceAmount: {
        amount: normalizeAmountString(fallbackAmount),
        currency: fallbackCurrency,
      },
      balanceType: 'interimAvailable',
      referenceDate: fallbackDate,
    },
  ];
}

function normalizeBalance(
  balance: unknown,
  fallbackCurrency: string,
  fallbackDate: string,
) {
  if (!balance || typeof balance !== 'object') {
    return null;
  }

  const raw = balance as Record<string, unknown>;
  const balanceAmount =
    raw.balanceAmount && typeof raw.balanceAmount === 'object'
      ? (raw.balanceAmount as Record<string, unknown>)
      : null;

  const amount = normalizeAmountString(balanceAmount?.amount ?? raw.amount);
  const currency = String(
    balanceAmount?.currency ?? raw.currency ?? fallbackCurrency,
  );
  const rawBalanceType = String(
    raw.balanceType ?? raw.type ?? 'interimAvailable',
  );
  const balanceType =
    rawBalanceType === 'FINAL_BALANCE'
      ? 'interimAvailable'
      : rawBalanceType === 'STARTING_BALANCE'
        ? 'openingBooked'
        : rawBalanceType;
  const referenceDate = getDateFromTimestamp(
    String(raw.referenceDate ?? raw.date ?? fallbackDate),
  );

  return {
    balanceAmount: {
      amount,
      currency,
    },
    balanceType,
    referenceDate,
  };
}

function getStartingBalance(
  balances: Array<{
    balanceAmount?: { amount?: string };
    balanceType?: string;
  }>,
  account: { availableBalance: unknown },
) {
  const currentBalance = balances.find(
    balance => balance.balanceType === 'interimAvailable',
  );
  return amountToInteger(
    currentBalance?.balanceAmount?.amount ??
      normalizeAmountString(account.availableBalance),
  );
}

function amountToInteger(amount: string) {
  return Math.round(Number(amount) * 100);
}

function normalizeAmountString(amount: unknown) {
  if (typeof amount === 'string') {
    return amount;
  }

  if (typeof amount === 'number') {
    return amount.toFixed(2);
  }

  return '0.00';
}

function getDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDateFromTimestamp(value: string) {
  const calendarDate = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(calendarDate)) {
    return calendarDate;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? calendarDate : getDate(parsed);
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function getMidpointDate(dateFrom: string, dateTo: string) {
  const start = parseDate(dateFrom).getTime();
  const end = parseDate(dateTo).getTime();
  const midpoint = new Date(start + Math.floor((end - start) / 2));
  return getDate(midpoint);
}

function sortTransactionsDescending(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
) {
  return Number(b.sortOrder ?? 0) - Number(a.sortOrder ?? 0);
}

function invalidToken(res: express.Response) {
  res.send({
    status: 'ok',
    data: {
      error_type: 'INVALID_ACCESS_TOKEN',
      error_code: 'INVALID_ACCESS_TOKEN',
      status: 'rejected',
      reason:
        'Invalid LHV.ai refresh token. Re-enter the token to continue syncing linked accounts.',
    },
  });
}

function serverDown(error: unknown, res: express.Response) {
  console.log(error);
  res.send({
    status: 'ok',
    data: {
      error_type: 'SERVER_DOWN',
      error_code: 'SERVER_DOWN',
      status: 'rejected',
      reason: 'There was an error communicating with LHV.ai.',
    },
  });
}
