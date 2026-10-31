import { v4 as uuidv4 } from 'uuid';

import * as db from '#server/db';
import * as monthUtils from '#shared/months';
import type { AccountEntity, TransactionEntity } from '#types/models';

import { batchUpdateTransactions } from '.';

export type DeferTransactionOptions = {
  id: TransactionEntity['id'];
  months: number;
  // Month (YYYY-MM) of the first virtual payment. Defaults to the month of
  // the original transaction.
  startMonth?: string;
  // Name used when the on-budget account that holds the prepaid balance has
  // to be found or created. Once chosen, the account is remembered by id in
  // the `prepaid-account` synced pref, so renaming it later is fine.
  prepaidAccountName: string;
};

// Spreads a prepaid expense over several months. The original transaction
// becomes a transfer into an on-budget "prepaid" account, so the source
// account still matches the bank. The prepaid account then pays out one
// virtual transaction per month with the original payee and category, which
// is what the budget and reports see.
export async function deferTransaction({
  id,
  months,
  startMonth,
  prepaidAccountName,
}: DeferTransactionOptions): Promise<{
  prepaidAccountId: AccountEntity['id'];
}> {
  if (!Number.isInteger(months) || months < 2) {
    throw new Error('A deferred transaction needs at least two months');
  }

  const transaction = await db.getTransaction(id);
  if (!transaction) {
    throw new Error(`Transaction not found: ${id}`);
  }
  if (transaction.is_parent || transaction.is_child) {
    throw new Error('Split transactions cannot be deferred');
  }
  if (transaction.transfer_id) {
    throw new Error('Transfers cannot be deferred');
  }
  if (transaction.reconciled) {
    throw new Error('Reconciled transactions cannot be deferred');
  }
  if (!transaction.category) {
    throw new Error('Only categorized transactions can be deferred');
  }
  const sourceAccount = await db.getAccount(transaction.account);
  if (sourceAccount?.offbudget) {
    throw new Error('Transactions in off-budget accounts cannot be deferred');
  }
  if (startMonth !== undefined && !monthUtils.isValidYearMonth(startMonth)) {
    throw new Error('Invalid start month');
  }

  // Nothing is written until every check has passed, so a rejected request
  // doesn't leave a new account or a remembered pref behind
  const found = await findPrepaidAccount(prepaidAccountName);
  if (found?.id === transaction.account) {
    throw new Error('Cannot defer a transaction within the prepaid account');
  }
  const prepaidAccountId =
    found?.id ?? (await createPrepaidAccount(prepaidAccountName));

  const transferPayee = await db.first<Pick<db.DbPayee, 'id'>>(
    'SELECT id FROM payees WHERE transfer_acct = ? AND tombstone = 0',
    [prepaidAccountId],
  );
  if (!transferPayee) {
    throw new Error('Prepaid account has no transfer payee');
  }

  const first = startMonth ?? monthUtils.monthFromDate(transaction.date);
  const day = Number(transaction.date.slice(8, 10));
  const amounts = splitAmount(transaction.amount, months);

  const added = amounts.map((amount, index) => {
    const month = monthUtils.addMonths(first, index);
    const lastDay = Number(monthUtils.lastDayOfMonth(month).slice(8, 10));
    const date = `${month}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
    const counter = `(${index + 1}/${months})`;

    return {
      id: uuidv4(),
      account: prepaidAccountId,
      amount,
      payee: transaction.payee,
      category: transaction.category,
      date,
      notes: transaction.notes ? `${transaction.notes} ${counter}` : counter,
      cleared: true,
    } satisfies TransactionEntity;
  });

  await batchUpdateTransactions({
    updated: [{ id, payee: transferPayee.id }],
    added,
  });

  if (!found?.isRemembered) {
    await db.update('preferences', {
      id: 'prepaid-account',
      value: prepaidAccountId,
    });
  }

  return { prepaidAccountId };
}

// Splits an amount (in cents) into `parts` amounts that sum to the
// original, spreading the leftover cents over the first parts.
export function splitAmount(amount: number, parts: number): number[] {
  const sign = amount < 0 ? -1 : 1;
  const total = Math.abs(amount);
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;

  return Array.from(
    { length: parts },
    (_, index) => sign * (base + (index < remainder ? 1 : 0)),
  );
}

// Finds the prepaid account without writing anything: the account remembered
// in the `prepaid-account` pref if it's still open and on budget, otherwise an
// open on-budget account with the default name
async function findPrepaidAccount(
  name: string,
): Promise<{ id: AccountEntity['id']; isRemembered: boolean } | null> {
  const pref = await db.first<Pick<db.DbPreference, 'value'>>(
    "SELECT value FROM preferences WHERE id = 'prepaid-account'",
  );
  if (pref?.value) {
    const remembered = await db.first<Pick<db.DbAccount, 'id'>>(
      'SELECT id FROM accounts WHERE id = ? AND offbudget = 0 AND closed = 0 AND tombstone = 0',
      [pref.value],
    );
    if (remembered) {
      return { id: remembered.id, isRemembered: true };
    }
  }

  const existing = await db.first<Pick<db.DbAccount, 'id'>>(
    'SELECT id FROM accounts WHERE name = ? AND offbudget = 0 AND closed = 0 AND tombstone = 0',
    [name],
  );
  return existing ? { id: existing.id, isRemembered: false } : null;
}

async function createPrepaidAccount(name: string) {
  const accountId: AccountEntity['id'] = await db.insertAccount({
    name,
    offbudget: 0,
    closed: 0,
  });
  await db.insertPayee({ name: '', transfer_acct: accountId });
  return accountId;
}
