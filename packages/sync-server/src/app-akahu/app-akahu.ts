import { AkahuClient } from 'akahu';
import type {
  Account,
  CurrencyConversion,
  EnrichedTransaction,
  PendingTransaction,
  Transaction,
} from 'akahu';
// For some reason this is not provided in the provided index.d.ts file
import type { EnrichedPendingTransaction } from 'akahu/dist/models/transactions';
import express from 'express';

import { handleError } from '#app-gocardless/util/handle-error';
import { SecretName, secretsService } from '#services/secrets-service';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from '#util/middlewares';
import { createMutex } from '#util/mutex';

type AkahuTransaction = {
  booked: boolean;
  date: string;
  payeeName: string;
  notes: string;
  category?: string;
  transactionId?: string;
  sortOrder: number;
  transactionAmount: { amount: number; currency: string };
  merchant?: {
    name: string;
    website?: string;
  };
  meta?: {
    particulars?: string;
    code?: string;
    reference?: string;
    other_account?: string;
    conversion?: CurrencyConversion;
    logo?: string;
    card_suffix?: string;
  };
};

const app = express();
export { app as handlers };
app.use(express.json());
app.use(requestLoggerMiddleware);
app.use(validateSessionMiddleware);

app.post(
  '/status',
  handleError(async (_req, res) => {
    const userToken = secretsService.get(SecretName.akahu_userToken);
    const appToken = secretsService.get(SecretName.akahu_appToken);

    const configured = userToken != null && appToken != null;

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
  handleError(async (_req, res) => {
    const userToken = secretsService.get(SecretName.akahu_userToken);
    const appToken = secretsService.get(SecretName.akahu_appToken);

    if (!userToken || !appToken) {
      res.send({
        status: 'ok',
        data: {
          error: 'Missing user or app token',
        },
      });
      return;
    }

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
      const errorMessage =
        error instanceof Error && error.message ? error.message : String(error);

      res.send({
        status: 'error',
        data: {
          error: errorMessage,
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

    const userToken = secretsService.get(SecretName.akahu_userToken);
    const appToken = secretsService.get(SecretName.akahu_appToken);

    if (!userToken || !appToken) {
      res.send({
        status: 'ok',
        data: {
          error: 'Missing user or app token',
        },
      });
      return;
    }

    try {
      const akahu = new AkahuClient({ appToken });

      const account = await getRefreshedAccount(akahu, userToken, accountId);
      if (!account) {
        return res.send({
          status: 'error',
          data: {
            error: 'Account not found',
          },
        });
      }

      if (!account.balance) {
        return res.send({
          status: 'error',
          data: {
            error: 'Account balance unavailable',
          },
        });
      }

      const now = new Date();
      const endDate = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1,
      ).toISOString();

      // Fetch all transactions using pagination
      const transactions: Transaction[] = [];
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

      const date = getDate(
        account.refreshed?.balance
          ? new Date(account.refreshed.balance)
          : new Date(),
      );
      const currentBalance = convertToCents(account.balance.current);

      const balances = [
        {
          balanceAmount: {
            amount: currentBalance,
            currency: account.balance.currency,
          },
          balanceType: 'expected',
          referenceDate: date,
        },
      ];

      if (account.balance.available) {
        balances.push({
          balanceAmount: {
            amount: convertToCents(account.balance.available),
            currency: account.balance.currency,
          },
          balanceType: 'interimAvailable',
          referenceDate: date,
        });
      }

      const startDateObj = new Date(startDate);
      const all = [];
      const booked = [];
      const pending = [];

      // Process booked transactions
      for (const trans of transactions) {
        if (new Date(trans.date) >= startDateObj) {
          const processedTrans = processTransaction(trans, account);
          booked.push(processedTrans);
          all.push(processedTrans);
        }
      }

      // Process pending transactions
      for (const trans of pendingTransactions) {
        if (new Date(trans.date) >= startDateObj) {
          const processedTrans = processPendingTransaction(trans, account);
          pending.push(processedTrans);
          all.push(processedTrans);
        }
      }

      const sortFunction = (a: AkahuTransaction, b: AkahuTransaction) =>
        b.sortOrder - a.sortOrder;
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
      const errorMessage =
        error instanceof Error && error.message ? error.message : String(error);

      res.send({
        status: 'error',
        data: {
          error: 'Failed to fetch transactions: ' + errorMessage,
        },
      });
    }
  }),
);

// prevent race conditions when refreshing accounts
const runRefresh = createMutex();

function getRefreshedAccount(
  akahu: AkahuClient,
  userToken: string,
  accountId: string,
): Promise<Account | null> {
  return runRefresh(async () => {
    let account = await akahu.accounts.get(userToken, accountId);
    if (!account) {
      return null;
    } else if (!shouldRefreshAccount(account.refreshed?.transactions)) {
      return account;
    }

    await akahu.accounts.refreshAll(userToken);

    // wait for the refresh to complete
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      account = await akahu.accounts.get(userToken, accountId);
      if (!account) {
        return null;
      } else if (!shouldRefreshAccount(account.refreshed?.transactions)) {
        // wait for transactions to settle
        await new Promise(resolve => setTimeout(resolve, 3000));
        break;
      }
    }

    return account;
  });
}

function getDate(date: Date): string {
  const parts = dateTimeFormatNZ.formatToParts(date);
  const month = parts[0].value;
  const day = parts[2].value;
  const year = parts[4].value;
  return `${year}-${month}-${day}`;
}

// Akahu gives us dates in UTC, but we want to display them in NZ time
const dateTimeFormatNZ = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Pacific/Auckland',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function convertToCents(amount: number): number {
  return Math.round(amount * 100);
}

type AnyTransaction =
  | Transaction
  | EnrichedTransaction
  | PendingTransaction
  | EnrichedPendingTransaction;

function getPayeeName(trans: AnyTransaction): string {
  return getMerchantName(trans) ?? getOtherAccount(trans) ?? trans.description;
}

function getMerchantName(trans: AnyTransaction): string | undefined {
  if ('merchant' in trans && trans.merchant) {
    return trans.merchant.name;
  }
  return undefined;
}

function getOtherAccount(trans: AnyTransaction): string | undefined {
  if ('meta' in trans && trans.meta) {
    return trans.meta.other_account ?? undefined;
  }
  return undefined;
}

function processPendingTransaction(
  trans: PendingTransaction | EnrichedPendingTransaction,
  account: Account,
): AkahuTransaction {
  const transactionDate = new Date(trans.date);

  return {
    ...trans,
    booked: false,
    date: getDate(transactionDate),
    payeeName: getPayeeName(trans),
    merchant: {
      name: getOtherAccount(trans) ?? '',
    },
    notes: trans.description,
    sortOrder: transactionDate.getTime(),
    transactionAmount: {
      amount: Math.round(trans.amount * 100) / 100,
      currency: account.balance?.currency ?? 'NZD',
    },
  };
}

function processTransaction(
  trans: Transaction | EnrichedTransaction,
  account: Account,
): AkahuTransaction {
  let category = undefined;
  if ('category' in trans && trans.category) {
    category = trans.category.name;
  }

  const merchant =
    'merchant' in trans && trans.merchant
      ? trans.merchant
      : {
          name: getOtherAccount(trans) ?? '',
        };

  return {
    ...processPendingTransaction(trans, account),
    merchant,
    category,
    booked: true,
    transactionId: trans._id,
  };
}

const AKAHU_TRANSACTION_REFRESH_INTERVAL_MS = 60 * 60 * 1000;

function shouldRefreshAccount(refreshedAt?: string) {
  if (!refreshedAt) {
    return false;
  }

  const refreshedAtTime = Date.parse(refreshedAt);
  return (
    Number.isFinite(refreshedAtTime) &&
    Date.now() - refreshedAtTime > AKAHU_TRANSACTION_REFRESH_INTERVAL_MS
  );
}
