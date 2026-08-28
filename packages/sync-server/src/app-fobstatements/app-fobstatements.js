import express from 'express';

import { isAdmin } from '#account-db';
import { handleError } from '#app-gocardless/util/handle-error';
import * as UserService from '#services/user-service';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from '#util/middlewares';
import { isValidFileId } from '#util/paths';

import { fobStatementsService } from './fobstatements-service';

const app = express();
export { app as handlers };
app.use(requestLoggerMiddleware);
app.use(express.json());
app.use(validateSessionMiddleware);

function canAccessFile(fileId, userId) {
  return isAdmin(userId) || UserService.countUserAccess(fileId, userId) > 0;
}

// Validates the optional per-budget-file header. Returns the fileId (or null)
// when access is allowed, or `false` after already sending an error response.
function resolveFileId(req, res) {
  const fileId = req.get('X-Actual-File-Id');
  if (!fileId) {
    return null;
  }

  if (!isValidFileId(fileId)) {
    res.status(400).send({
      status: 'error',
      reason: 'invalid-file-id',
      details: 'invalid fileId',
    });
    return false;
  }

  if (!canAccessFile(fileId, res.locals.user_id)) {
    res.status(403).send({
      status: 'error',
      reason: 'file-access-denied',
      details: "You don't have permissions over this file",
    });
    return false;
  }

  return fileId;
}

// FOB transaction amounts are integers scaled x1000. Actual expects a decimal
// in major units for `transactionAmount.amount`.
function toDecimalAmount(inflow, outflow) {
  return ((inflow ?? 0) - (outflow ?? 0)) / 1000;
}

app.post(
  '/status',
  handleError(async (req, res) => {
    const fileId = resolveFileId(req, res);
    if (fileId === false) return;

    const source = fobStatementsService.getCredentialSource(fileId);

    res.send({
      status: 'ok',
      data: {
        configured: !!source,
        source,
      },
    });
  }),
);

app.post(
  '/accounts',
  handleError(async (req, res) => {
    const fileId = resolveFileId(req, res);
    if (fileId === false) return;

    try {
      const source = fobStatementsService.getCredentialSource(fileId);
      if (!source) {
        res.status(400).send({
          status: 'error',
          reason: 'not-configured',
          details: 'FOB Statements credentials are not configured',
        });
        return;
      }

      const accounts = await fobStatementsService.getAccounts(fileId);

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
          error: error.message,
        },
      });
    }
  }),
);

// Balance as of a given day (decimal, major units) for the opening-balance
// auto-fill in the link modal. FOB already reports credit-card balances as
// negative (the same liability convention as Actual), so the value is passed
// through as-is.
app.post(
  '/balance',
  handleError(async (req, res) => {
    const { accountId, date } = req.body || {};
    const fileId = resolveFileId(req, res);
    if (fileId === false) return;

    try {
      const source = fobStatementsService.getCredentialSource(fileId);
      if (!source) {
        res.status(400).send({
          status: 'error',
          reason: 'not-configured',
          details: 'FOB Statements credentials are not configured',
        });
        return;
      }

      const balance = await fobStatementsService.getAccountBalance(
        accountId,
        date,
        fileId,
      );

      res.send({
        status: 'ok',
        data: {
          balance,
        },
      });
    } catch (error) {
      res.send({
        status: 'ok',
        data: {
          error: error.message,
        },
      });
    }
  }),
);

app.post(
  '/transactions',
  handleError(async (req, res) => {
    const { accountId, startDate } = req.body || {};
    const fileId = resolveFileId(req, res);
    if (fileId === false) return;

    try {
      const source = fobStatementsService.getCredentialSource(fileId);
      if (!source) {
        res.status(400).send({
          status: 'error',
          reason: 'not-configured',
          details: 'FOB Statements credentials are not configured',
        });
        return;
      }

      const account = await fobStatementsService.getAccountById(
        accountId,
        fileId,
      );
      const currency = account?.currency ?? 'INR';

      const rawTransactions = await fobStatementsService.getTransactions(
        accountId,
        startDate,
        fileId,
      );

      // `startingBalance` represents the account's CURRENT balance (integer
      // cents). Actual uses it for `updateAccountBalance` on ongoing syncs. FOB
      // already reports credit-card balances as negative, matching Actual's
      // liability convention, so no sign adjustment is applied.
      const currentBalance = await fobStatementsService.getAccountBalance(
        accountId,
        undefined,
        fileId,
      );
      const startingBalance = Math.round((currentBalance ?? 0) * 100);

      const balances = [
        {
          balanceAmount: {
            amount: startingBalance,
            currency,
          },
          balanceType: 'expected',
          referenceDate: new Date().toISOString().slice(0, 10),
        },
      ];

      const all = rawTransactions.map(trans => ({
        booked: true,
        date: trans.date,
        // Use FOB's identified counterparty as the payee. When it hasn't
        // identified one, leave the payee blank rather than falling back to the
        // raw narration: `particulars` is already carried in `notes` (which
        // Actual rules can match on), so using it as the payee would only
        // pollute the payee list with near-unique narration strings.
        payeeName: trans.entity || '',
        notes: trans.particulars,
        transactionAmount: {
          amount: toDecimalAmount(trans.inflow, trans.outflow),
          currency,
        },
        transactionId: trans.id,
      }));

      // FOB statements are settled records; there is no pending concept.
      res.send({
        status: 'ok',
        data: {
          balances,
          startingBalance,
          transactions: {
            all,
            booked: all,
            pending: [],
          },
        },
      });
    } catch (error) {
      res.send({
        status: 'ok',
        data: {
          error: error.message,
        },
      });
    }
  }),
);
