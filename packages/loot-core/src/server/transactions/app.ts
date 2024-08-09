// @ts-strict-ignore
import { Query } from 'loot-core/shared/query';
import { exportQueryToCSV, exportToCSV } from '../accounts/export-to-csv';
import { parseFile } from '../accounts/parse-file';
import { batchUpdateTransactions } from '../accounts/transactions';
import { createApp } from '../app';
import { mutator } from '../mutators';
import { withUndo } from '../undo';
import * as bankSync from '../accounts/sync';

import { TransactionsHandler } from './types/handlers';
import { APIError, TransactionError } from '../errors';


// Expose functions to the client
export const app = createApp<TransactionsHandler>();

app.method('transactions-batch-update', mutator(async function ({
  added,
  deleted,
  updated,
  learnCategories
}) {
  return withUndo(async () => {
    const result = await batchUpdateTransactions({
      added,
      updated,
      deleted,
      learnCategories,
    });

    return result;
  });
}));

app.method('transaction-add', mutator(async function (transaction) {
  await app['transactions-batch-update']({ added: [transaction] });
  return {};
}));

app.method('transaction-update', mutator(async function (transaction) {
  await app['transactions-batch-update']({ updated: [transaction] });
  return {};
}));

app.method('transaction-delete', mutator(async function (transaction) {
  await app['transactions-batch-update']({ deleted: [transaction] });
  return {};
}));

app.method('transactions-parse-file', mutator(async function ({ filepath, options }) {
  return parseFile(filepath, options);
}));

app.method('transactions-export', mutator(async function ({
  transactions,
  accounts,
  categoryGroups,
  payees,
}) {
  return exportToCSV(transactions, accounts, categoryGroups, payees);
}));

app.method('transactions-export-query', mutator(async function ({ query: queryState }) {
  return exportQueryToCSV(new Query(queryState));
}));

app.method('transactions-import', mutator(function ({
  accountId,
  transactions,
  isPreview,
}) {
  return withUndo(async () => {
    if (typeof accountId !== 'string') {
      throw APIError('transactions-import: accountId must be an id');
    }

    try {
      return await bankSync.reconcileTransactions(
        accountId,
        transactions,
        false,
        isPreview,
      );
    } catch (err) {
      if (err instanceof TransactionError) {
        return {
          errors: [{ message: err.message }],
          added: [],
          updated: [],
          updatedPreview: [],
        };
      }

      throw err;
    }
  });
}));