import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { batchMessages } from '#server/sync';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import type { AccountEntity, TransactionEntity } from '#types/models';
import type { SyncedPrefs } from '#types/prefs';

// The two sides of a transfer don't always post on the same day, for example
// when the transfer is made right before a weekend.
const TRANSFER_DATE_WINDOW_DAYS = 3;

type TransferSide = Pick<
  TransactionEntity,
  'id' | 'account' | 'amount' | 'date'
> & {
  imported_id?: string | null;
};

export async function isTransferDetectionEnabled(): Promise<boolean> {
  const { data } = await aqlQuery(
    q('preferences')
      .filter({
        id: 'flags.bankSyncTransferDetection' satisfies keyof SyncedPrefs,
      })
      .select('value'),
  );
  return String(data?.[0]?.value) === 'true';
}

// Only transactions with one of the given amounts are read, so a sync that
// covers a long history doesn't load every transaction of that period.
async function getLinkableTransactions(
  from: string,
  to: string,
  amounts: number[],
  openAccountIds: Set<AccountEntity['id']>,
): Promise<TransferSide[]> {
  const rows = await db.all<
    Pick<
      db.DbViewTransactionInternalAlive,
      | 'id'
      | 'account'
      | 'amount'
      | 'date'
      | 'imported_id'
      | 'is_parent'
      | 'is_child'
      | 'starting_balance_flag'
      | 'reconciled'
    >
  >(
    `SELECT id, account, amount, date, imported_id, is_parent, is_child,
            starting_balance_flag, reconciled
       FROM v_transactions_internal_alive
       WHERE date >= ? AND date <= ? AND transfer_id IS NULL
         AND amount IN (${amounts.filter(Number.isInteger).join(',')})`,
    [db.toDateRepr(from), db.toDateRepr(to)],
  );

  return rows
    .filter(
      row =>
        !row.is_parent &&
        !row.is_child &&
        !row.starting_balance_flag &&
        !row.reconciled &&
        openAccountIds.has(row.account),
    )
    .map(row => ({
      id: row.id,
      account: row.account,
      amount: row.amount,
      date: db.fromDateRepr(row.date),
      imported_id: row.imported_id,
    }));
}

// Turning one side of a transfer back into a normal transaction deletes the
// other side, which the next bank sync then imports again. Linking that
// transaction again, to either the same or another transaction, would undo
// the user's correction.
async function wasDeletedBefore(transaction: TransferSide): Promise<boolean> {
  if (!transaction.imported_id) {
    return false;
  }
  const deleted = await db.first<Pick<db.DbViewTransactionInternal, 'id'>>(
    `SELECT id FROM v_transactions_internal
       WHERE tombstone = 1 AND account = ? AND imported_id = ? LIMIT 1`,
    [transaction.account, transaction.imported_id],
  );
  return deleted != null;
}

/**
 * Links each of the given transactions to the transaction on the other side
 * of the transfer, the same way the "Make transfer" action does.
 *
 * Two transactions are linked only when they are in different accounts, their
 * amounts cancel out, their dates are a few days apart at most, and neither
 * of them could be paired with any other transaction. An ambiguous pairing is
 * left alone rather than guessed, and so is a transaction that is imported
 * again after it was deleted.
 *
 * Returns the ids of the transactions on the other side of the new transfers.
 */
export async function linkDetectedTransfers(
  transactionIds: Array<TransactionEntity['id']>,
): Promise<Array<TransactionEntity['id']>> {
  if (transactionIds.length === 0) {
    return [];
  }

  const { data }: { data: Array<Pick<TransactionEntity, 'date' | 'amount'>> } =
    await aqlQuery(
      q('transactions')
        .filter({ id: { $oneof: transactionIds }, transfer_id: null })
        .select(['date', 'amount']),
    );
  const imported = data.filter(transaction => transaction.amount !== 0);
  if (imported.length === 0) {
    return [];
  }

  const accounts = await db.getAccounts();
  const offBudgetByAccount = new Map<AccountEntity['id'], boolean>(
    accounts
      .filter(account => !account.closed)
      .map(account => [account.id, account.offbudget === 1]),
  );
  const transferPayeeByAccount = new Map<AccountEntity['id'], string>();
  for (const payee of await db.getPayees()) {
    if (payee.transfer_acct) {
      transferPayeeByAccount.set(payee.transfer_acct, payee.id);
    }
  }

  const sortedDates = imported.map(({ date }) => date).sort();
  // A counterpart is up to one window away, and the transactions competing
  // for that counterpart are up to one more window away from it. They have
  // the opposite amount and the same amount respectively.
  const linkable = await getLinkableTransactions(
    monthUtils.subDays(sortedDates[0], TRANSFER_DATE_WINDOW_DAYS * 2),
    monthUtils.addDays(
      sortedDates[sortedDates.length - 1],
      TRANSFER_DATE_WINDOW_DAYS * 2,
    ),
    [...new Set(imported.flatMap(({ amount }) => [amount, -amount]))],
    new Set(offBudgetByAccount.keys()),
  );

  const linkableByAmount = new Map<number, TransferSide[]>();
  for (const transaction of linkable) {
    const sameAmount = linkableByAmount.get(transaction.amount) ?? [];
    sameAmount.push(transaction);
    linkableByAmount.set(transaction.amount, sameAmount);
  }

  function findCounterparts(transaction: TransferSide) {
    const earliest = monthUtils.subDays(
      transaction.date,
      TRANSFER_DATE_WINDOW_DAYS,
    );
    const latest = monthUtils.addDays(
      transaction.date,
      TRANSFER_DATE_WINDOW_DAYS,
    );
    return (linkableByAmount.get(-transaction.amount) ?? []).filter(
      candidate =>
        candidate.account !== transaction.account &&
        candidate.date >= earliest &&
        candidate.date <= latest,
    );
  }

  const importedIds = new Set(transactionIds);
  const linkedIds = new Set<TransactionEntity['id']>();
  const counterpartIds: Array<TransactionEntity['id']> = [];
  const updates: Array<{
    id: TransactionEntity['id'];
    payee: string;
    transfer_id: TransactionEntity['id'];
    category?: null;
  }> = [];

  for (const sameAmount of linkableByAmount.values()) {
    for (const transaction of sameAmount) {
      if (!importedIds.has(transaction.id) || linkedIds.has(transaction.id)) {
        continue;
      }

      const counterparts = findCounterparts(transaction);
      if (counterparts.length !== 1) {
        continue;
      }
      const [counterpart] = counterparts;

      // The counterpart always finds `transaction`, so finding anything else
      // means another transaction could be the other side just as well.
      if (findCounterparts(counterpart).length !== 1) {
        continue;
      }

      if (
        (await wasDeletedBefore(transaction)) ||
        (await wasDeletedBefore(counterpart))
      ) {
        continue;
      }

      const payee = transferPayeeByAccount.get(counterpart.account);
      const counterpartPayee = transferPayeeByAccount.get(transaction.account);
      if (!payee || !counterpartPayee) {
        continue;
      }

      // A category only matters when money moves in or out of the budget,
      // i.e. between an on budget and an off budget account. This matches
      // what happens when a transfer is created by hand.
      const clearCategory =
        offBudgetByAccount.get(transaction.account) ===
        offBudgetByAccount.get(counterpart.account);

      updates.push(
        {
          id: transaction.id,
          payee,
          transfer_id: counterpart.id,
          ...(clearCategory ? { category: null } : {}),
        },
        {
          id: counterpart.id,
          payee: counterpartPayee,
          transfer_id: transaction.id,
          ...(clearCategory ? { category: null } : {}),
        },
      );
      linkedIds.add(transaction.id).add(counterpart.id);
      counterpartIds.push(counterpart.id);
    }
  }

  await batchMessages(async () => {
    await Promise.all(updates.map(update => db.updateTransaction(update)));
  });

  return counterpartIds;
}
