import express from 'express';
import type { Account, Transaction } from 'pluggy-sdk';

import { handleError } from '#app-gocardless/util/handle-error';
import { SecretName, secretsService } from '#services/secrets-service';
import * as UserService from '#services/user-service';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from '#util/middlewares';
import { isValidFileId } from '#util/paths';
import { validateBankSyncSession } from '#util/validate-budget-session';

import { pluggyaiService } from './pluggyai-service';

// The service marks the transactions of Pluggy's sandbox account.
type PluggyTransaction = Transaction & { sandbox?: boolean };

const app = express();
export { app as handlers };
app.use(requestLoggerMiddleware);
app.use(express.json());
// SECURITY NOTE (intended behaviour - not a vulnerability):
// Routes below that read bank data with stored credentials only require a
// valid session; they deliberately do NOT check the user's role. Setting
// server-wide (global) bank-sync credentials is admin-only, but every
// signed-in user on that server may use them. This is a supported feature
// and will remain; budgets with their own credentials use those instead.
// API keys need explicit permission to use shared credentials.
// All users on one server are trusted; roles are not a security boundary.
// See SECURITY.md ("Threat model" and "Out of scope").
const bankSync = express.Router();
bankSync.use(validateBankSyncSession({ allowGlobalCredentials: true }));
const budgetAccounts = express.Router();
budgetAccounts.use(validateBankSyncSession());
app.use(bankSync, budgetAccounts);
app.use(validateSessionMiddleware);

bankSync.post(
  '/status',
  handleError(async (req, res) => {
    const fileId = req.get('X-Actual-File-Id');
    if (!!fileId) {
      if (!isValidFileId(fileId)) {
        res.status(400).send({
          status: 'error',
          reason: 'invalid-file-id',
          details: 'invalid fileId',
        });
        return;
      }

      if (!UserService.canAccessActiveFile(fileId, res.locals.user_id)) {
        res.status(403).send({
          status: 'error',
          reason: 'file-access-denied',
          details: "You don't have permissions over this file",
        });
        return;
      }
    }

    const source = pluggyaiService.getCredentialSource(
      fileId,
      res.locals.allowGlobalBankSync,
    );

    res.send({
      status: 'ok',
      data: {
        configured: !!source,
        source,
      },
    });
  }),
);

budgetAccounts.post(
  '/accounts',
  handleError(async (req, res) => {
    const fileId = req.get('X-Actual-File-Id');
    if (!!fileId) {
      if (!isValidFileId(fileId)) {
        res.status(400).send({
          status: 'error',
          reason: 'invalid-file-id',
          details: 'invalid fileId',
        });
        return;
      }

      if (!UserService.canAccessActiveFile(fileId, res.locals.user_id)) {
        res.status(403).send({
          status: 'error',
          reason: 'file-access-denied',
          details: "You don't have permissions over this file",
        });
        return;
      }
    }

    try {
      const source = pluggyaiService.getCredentialSource(
        fileId,
        res.locals.allowGlobalBankSync,
      );
      if (!source) {
        res.status(400).send({
          status: 'error',
          reason: 'not-configured',
          details: 'Pluggy credentials are not configured',
        });
        return;
      }

      const credentialFileId = source === 'per-budget-file' ? fileId : null;
      const itemIds = (
        secretsService.get(SecretName.pluggyai_itemIds, credentialFileId) ?? ''
      )
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);

      let accounts: Account[] = [];

      for (const item of itemIds) {
        const partial = await pluggyaiService.getAccountsByItemId(
          item,
          fileId,
          res.locals.allowGlobalBankSync,
        );
        accounts = accounts.concat(partial.results);
      }

      res.send({
        status: 'ok',
        data: {
          accounts,
        },
      });
    } catch (error) {
      res.send({
        status: 'ok',
        data: {
          error: getErrorMessage(error),
        },
      });
    }
  }),
);

bankSync.post(
  '/transactions',
  handleError(async (req, res) => {
    const { accountId, startDate } = req.body || {};
    const fileId = req.get('X-Actual-File-Id');
    if (!!fileId) {
      if (!isValidFileId(fileId)) {
        res.status(400).send({
          status: 'error',
          reason: 'invalid-file-id',
          details: 'invalid fileId',
        });
        return;
      }

      if (!UserService.canAccessActiveFile(fileId, res.locals.user_id)) {
        res.status(403).send({
          status: 'error',
          reason: 'file-access-denied',
          details: "You don't have permissions over this file",
        });
        return;
      }
    }

    try {
      const source = pluggyaiService.getCredentialSource(
        fileId,
        res.locals.allowGlobalBankSync,
      );
      if (!source) {
        res.status(400).send({
          status: 'error',
          reason: 'not-configured',
          details: 'Pluggy credentials are not configured',
        });
        return;
      }

      const account = await pluggyaiService.getAccountById(
        accountId,
        fileId,
        res.locals.allowGlobalBankSync,
      );
      if (res.locals.apiKeyFileIds) {
        const itemIds = (
          secretsService.get(
            SecretName.pluggyai_itemIds,
            source === 'per-budget-file' ? fileId : null,
          ) ?? ''
        )
          .split(',')
          .map(item => item.trim());
        if (!itemIds.includes(account.itemId)) {
          res
            .status(403)
            .send({ status: 'error', reason: 'file-access-denied' });
          return;
        }
      }

      const transactions = await pluggyaiService.getTransactionsByAccountId(
        accountId,
        startDate,
        fileId,
        res.locals.allowGlobalBankSync,
      );

      let startingBalance = parseInt(
        Math.round(account.balance * 100).toString(),
      );
      if (account.type === 'CREDIT') {
        startingBalance = -startingBalance;
      }
      // The Pluggy API returns `updatedAt` on accounts, but the SDK's
      // `Account` type leaves it out.
      if (!('updatedAt' in account) || !(account.updatedAt instanceof Date)) {
        throw new Error('Pluggy account has no update date');
      }
      const date = getDate(account.updatedAt);

      const balances = [
        {
          balanceAmount: {
            amount: startingBalance,
            currency: account.currencyCode,
          },
          balanceType: 'expected',
          referenceDate: date,
        },
      ];

      const all = [];
      const booked = [];
      const pending = [];

      for (const trans of Object.values<unknown>(transactions)) {
        if (!isTransaction(trans)) {
          continue;
        }

        const transactionDate = trans.date;

        if (transactionDate < startDate && !trans.sandbox) {
          continue;
        }

        if (account.type === 'CREDIT') {
          if (trans.amountInAccountCurrency) {
            trans.amountInAccountCurrency *= -1;
          }

          trans.amount *= -1;
        }

        let amountInCurrency = trans.amountInAccountCurrency ?? trans.amount;
        amountInCurrency = Math.round(amountInCurrency * 100) / 100;

        const newTrans = {
          booked: !(trans.status === 'PENDING'),
          date: getDate(getTransactionDateCorrected(trans)),
          payeeName: getPayeeName(trans),
          notes: trans.descriptionRaw || trans.description,
          transactionAmount: {
            amount: amountInCurrency,
            currency: trans.currencyCode,
          },
          transactionId: trans.id,
          sortOrder: transactionDate.getTime(),
          originalDate: getDate(transactionDate),
        };

        const flattened = flattenObject(trans);
        delete flattened.amount;

        const finalTrans = { ...flattened, ...newTrans };

        if (newTrans.booked) {
          booked.push(finalTrans);
        } else {
          pending.push(finalTrans);
        }
        all.push(finalTrans);
      }

      const sortFunction = (
        a: { sortOrder: number },
        b: { sortOrder: number },
      ) => b.sortOrder - a.sortOrder;

      const bookedSorted = booked.sort(sortFunction);
      const pendingSorted = pending.sort(sortFunction);
      const allSorted = all.sort(sortFunction);

      res.send({
        status: 'ok',
        data: {
          balances,
          startingBalance,
          transactions: {
            all: allSorted,
            booked: bookedSorted,
            pending: pendingSorted,
          },
        },
      });
    } catch (error) {
      res.send({
        status: 'ok',
        data: {
          error: getErrorMessage(error),
        },
      });
    }
    return;
  }),
);

function getDate(date: Date) {
  return date.toISOString().split('T')[0];
}

// The Pluggy SDK rejects with the response body of a failed request, which is
// a plain object and not an Error.
function getErrorMessage(error: unknown): unknown {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return error.message;
  }

  return undefined;
}

// The service returns the transactions spread into one object next to
// `hasError` and `errors`, so not every value is a transaction.
function isTransaction(value: unknown): value is PluggyTransaction {
  return (
    typeof value === 'object' && value !== null && Object.keys(value).length > 0
  );
}

function flattenObject(obj: object, prefix = '') {
  const result: Record<string, unknown> = {};

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

function getPayeeName(trans: Transaction) {
  if (trans.merchant && (trans.merchant.name || trans.merchant.businessName)) {
    return trans.merchant.name || trans.merchant.businessName || '';
  }

  if (trans.paymentData) {
    const { receiver, payer } = trans.paymentData;

    if (trans.type === 'DEBIT' && receiver) {
      return receiver.name || receiver.documentNumber?.value || '';
    }

    if (trans.type === 'CREDIT' && payer) {
      return payer.name || payer.documentNumber?.value || '';
    }
  }

  return '';
}

//useful to avoid add month to day 31, which would result in day 01 skipping to the next month
function addMonthsClamped(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

function getTransactionDateCorrected(trans: Transaction) {
  if (trans.creditCardMetadata?.installmentNumber != null) {
    return addMonthsClamped(
      trans.creditCardMetadata.purchaseDate || trans.date,
      trans.creditCardMetadata.installmentNumber - 1,
    );
  }

  return trans.date;
}
