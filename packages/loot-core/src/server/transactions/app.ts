import { Query } from '../../shared/query';
import { createApp } from '../app';
import { mutator } from '../mutators';
import { undoable } from '../undo';

import { exportQueryToCSV, exportToCSV } from './export/export-to-csv';
import { parseFile } from './import/parse-file';

import { batchUpdateTransactions } from '.';

export type TransactionHandlers = {
  'transactions-batch-update': typeof handleBatchUpdateTransactions;
  'transactions-add': typeof addTransaction;
  'transactions-update': typeof updateTransaction;
  'transactions-delete': typeof deleteTransaction;
  'transactions-parse-file': typeof parseTransactionsFile;
  'transactions-export': typeof exportTransactions;
  'transactions-export-query': typeof exportTransactionsQuery;
};

async function handleBatchUpdateTransactions({
  added,
  deleted,
  updated,
  learnCategories,
}: Parameters<typeof batchUpdateTransactions>[0]) {
  const result = await batchUpdateTransactions({
    added,
    updated,
    deleted,
    learnCategories,
  });

  return result;
}

async function addTransaction(transaction) {
  await handleBatchUpdateTransactions({ added: [transaction] });
  return {};
}

async function updateTransaction(transaction) {
  await handleBatchUpdateTransactions({ updated: [transaction] });
  return {};
}

async function deleteTransaction(transaction) {
  await handleBatchUpdateTransactions({ deleted: [transaction] });
  return {};
}

async function parseTransactionsFile({ filepath, options }) {
  return parseFile(filepath, options);
}

async function exportTransactions({
  transactions,
  accounts,
  categoryGroups,
  payees,
}) {
  return exportToCSV(transactions, accounts, categoryGroups, payees);
}

async function exportTransactionsQuery({ query: queryState }) {
  return exportQueryToCSV(new Query(queryState));
}

export const app = createApp<TransactionHandlers>();

app.method(
  'transactions-batch-update',
  mutator(undoable(handleBatchUpdateTransactions)),
);

app.method('transactions-add', mutator(addTransaction));
app.method('transactions-update', mutator(updateTransaction));
app.method('transactions-delete', mutator(deleteTransaction));
app.method('transactions-parse-file', mutator(parseTransactionsFile));
app.method('transactions-export', mutator(exportTransactions));
app.method('transactions-export-query', mutator(exportTransactionsQuery));
