// @ts-strict-ignore
import { insertWithSchema, updateWithSchema, delete_ } from '../db';

export function insertTransaction(transaction) {
  return insertWithSchema('transactions', transaction);
}

export function updateTransaction(transaction) {
  return updateWithSchema('transactions', transaction);
}

export async function deleteTransaction(transaction: { id: string }) {
  return delete_('transactions', transaction.id);
}
