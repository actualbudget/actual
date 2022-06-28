import {
  delete_,
  insertWithSchema,
  selectWithSchema,
  updateWithSchema
} from './db-actions';

export async function getTransaction(id) {
  let rows = await selectWithSchema(
    'transactions',
    'SELECT * FROM v_transactions WHERE id = ?',
    [id]
  );
  return rows[0];
}

export async function getTransactionsByDate(
  accountId,
  startDate,
  endDate,
  options = {}
) {
  throw new Error('`getTransactionsByDate` is deprecated');
}

export async function getTransactions(accountId, arg2) {
  if (arg2 !== undefined) {
    throw new Error(
      '`getTransactions` was given a second argument, it now only takes a single argument `accountId`'
    );
  }

  return selectWithSchema(
    'transactions',
    'SELECT * FROM v_transactions WHERE account = ?',
    [accountId]
  );
}

export function insertTransaction(transaction) {
  return insertWithSchema('transactions', transaction);
}

export function updateTransaction(transaction) {
  return updateWithSchema('transactions', transaction);
}

export async function deleteTransaction(transaction) {
  return delete_('transactions', transaction.id);
}
