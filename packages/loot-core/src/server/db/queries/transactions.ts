import { selectWithSchema } from "../db";
import { DbViewTransaction, DbTransaction } from "../types";

export async function getTransaction(id: DbViewTransaction['id']) {
  const rows = await selectWithSchema(
    'transactions',
    'SELECT * FROM v_transactions WHERE id = ?',
    [id],
  );
  return rows[0];
}

export async function getTransactions(accountId: DbTransaction['acct']) {
  if (arguments.length > 1) {
    throw new Error(
      '`getTransactions` was given a second argument, it now only takes a single argument `accountId`',
    );
  }

  return selectWithSchema(
    'transactions',
    'SELECT * FROM v_transactions WHERE account = ?',
    [accountId],
  );
}
