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
  // Validate before creating the prepaid account so a bad request doesn't
  // leave it behind
  if (startMonth !== undefined && !monthUtils.isValidYearMonth(startMonth)) {
    throw new Error('Invalid start month');
  }

  const prepaidAccountId = await getOrCreatePrepaidAccount(prepaidAccountName);
  if (prepaidAccountId === transaction.account) {
    throw new Error('Cannot defer a transaction within the prepaid account');
  }

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

async function getOrCreatePrepaidAccount(name: string) {
  const pref = await db.first<Pick<db.DbPreference, 'value'>>(
    "SELECT value FROM preferences WHERE id = 'prepaid-account'",
  );
  if (pref?.value) {
    const remembered = await db.first<Pick<db.DbAccount, 'id'>>(
      'SELECT id FROM accounts WHERE id = ? AND offbudget = 0 AND closed = 0 AND tombstone = 0',
      [pref.value],
    );
    if (remembered) {
      return remembered.id;
    }
  }

  // The remembered account is missing, closed or off budget. Adopt an
  // existing account with the default name, or create one.
  const existing = await db.first<Pick<db.DbAccount, 'id'>>(
    'SELECT id FROM accounts WHERE name = ? AND offbudget = 0 AND closed = 0 AND tombstone = 0',
    [name],
  );
  let accountId: AccountEntity['id'];
  if (existing) {
    accountId = existing.id;
  } else {
    accountId = await db.insertAccount({ name, offbudget: 0, closed: 0 });
    await db.insertPayee({ name: '', transfer_acct: accountId });
  }

  await db.update('preferences', { id: 'prepaid-account', value: accountId });
  return accountId;
}
