import createDebug from 'debug';
import express from 'express';

import { handleError } from '#app-gocardless/util/handle-error';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from '#util/middlewares';

import {
  isImportableTransaction,
  normalizeAccount,
  normalizeBalance,
  normalizeTransaction,
  openBankingIoService,
} from './services/openbankingio-service';

const debug = createDebug('actual:openbankingio:app');

const app = express();
export { app as handlers };
app.use(requestLoggerMiddleware);
app.use(express.json());
app.use(validateSessionMiddleware);

app.post(
  '/status',
  handleError(async (req, res) => {
    const configured = openBankingIoService.isConfigured();

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
    const accounts = await openBankingIoService.getAccounts();

    res.send({
      status: 'ok',
      data: {
        accounts: accounts.map(normalizeAccount),
      },
    });
  }),
);

app.post(
  '/transactions',
  handleError(async (req, res) => {
    const { accountId, startDate } = req.body || {};

    if (!accountId || !startDate) {
      res.send({
        status: 'ok',
        data: {
          error_code: 'INVALID_INPUT',
          error_type: 'Missing accountId or startDate',
        },
      });
      return;
    }

    const dateFrom =
      typeof startDate === 'string'
        ? startDate
        : new Date(startDate).toISOString().split('T')[0];

    // Balances (and the starting balance) come from the account listing; the
    // SDK returns them inline per account.
    const accounts = await openBankingIoService.getAccounts();
    const account = accounts.find(a => a.id === accountId);

    let balances = [];
    // Null (not 0) when the account is missing from the listing, so loot-core
    // skips the balance update rather than zeroing the displayed balance.
    let startingBalance = null;
    if (account) {
      balances = (account.balances || []).map(bal =>
        normalizeBalance(bal, account.currency),
      );

      // Prefer the interim booked balance ('ITBD'), falling back to the first
      // balance if it is not present.
      const preferredBalance =
        balances.find(b => b.balanceType === 'ITBD') ?? balances[0];
      if (preferredBalance) {
        startingBalance = preferredBalance.balanceAmount.amount;
      }
    }

    const rawTransactions = await openBankingIoService.getAllTransactions(
      accountId,
      dateFrom,
    );

    const all = [];
    const booked = [];
    const pending = [];

    for (const tx of rawTransactions) {
      const normalized = normalizeTransaction(tx);

      // Drop records Actual's client can't insert (empty/non-ISO date or
      // non-numeric amount) — one of them would otherwise abort the entire
      // account sync. Pending transactions that carry a date are unaffected.
      if (!isImportableTransaction(normalized)) {
        debug(
          'Skipping unimportable transaction id=%s date=%s amount=%s',
          normalized.transactionId,
          normalized.date,
          normalized.transactionAmount.amount,
        );
        continue;
      }

      all.push(normalized);
      if (normalized.booked) {
        booked.push(normalized);
      } else {
        pending.push(normalized);
      }
    }

    res.send({
      status: 'ok',
      data: {
        transactions: {
          all,
          booked,
          pending,
        },
        balances,
        startingBalance,
      },
    });
  }),
);
