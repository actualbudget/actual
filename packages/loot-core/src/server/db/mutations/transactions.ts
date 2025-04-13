import { insertWithSchema, updateWithSchema, delete_ } from "../db";
import { DbTransaction } from "../types";

export function insertTransaction(transaction: any) {
  return insertWithSchema('transactions', transaction);
}

export function updateTransaction(transaction: any) {
  return updateWithSchema('transactions', transaction);
}

export async function deleteTransaction(transaction: { id: string }) {
  return delete_('transactions', transaction.id);
}
