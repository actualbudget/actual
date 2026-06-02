import { AkahuClient } from 'akahu';
import type {
  Account,
  EnrichedTransaction,
  PendingTransaction,
  Transaction,
} from 'akahu';
import express from 'express';

import { handleError } from '#app-gocardless/util/handle-error';
import { SecretName, secretsService } from '#services/secrets-service';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from '#util/middlewares';

type AkahuTransaction = {
  booked: boolean;
  date: string;
  payeeName: string;
  notes?: string;
  transactionId?: string;
  sortOrder: number;
  transactionAmount: { amount: number; currency: string };
};

const app = express();
export { app as handlers };
app.use(express.json());
app.use(requestLoggerMiddleware);
app.use(validateSessionMiddleware);

app.post(
  '/status',
  handleError(async (req, res) => {
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
  handleError(async (req, res) => {
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

      const account = await akahu.accounts.get(userToken, accountId);
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

function isEnriched(
  trans: Transaction | EnrichedTransaction,
): trans is EnrichedTransaction {
  return 'merchant' in trans || 'meta' in trans;
}

function getDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function convertToCents(amount: number): number {
  return Math.round(amount * 100);
}

function getPayeeName(trans: Transaction | EnrichedTransaction): string {
  if (isEnriched(trans)) {
    if (trans.merchant?.name) {
      return trans.merchant.name;
    }

    if (trans.meta?.other_account) {
      return trans.meta.other_account;
    }
  }

  return '';
}

function processPendingTransaction(
  trans: PendingTransaction,
  account: Account,
): AkahuTransaction {
  const transactionDate = new Date(trans.date);

  return {
    booked: false,
    date: getDate(transactionDate),
    payeeName: '',
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
  return {
    ...processPendingTransaction(trans, account),
    booked: true,
    payeeName: getPayeeName(trans),
    transactionId: trans._id,
  };
}
