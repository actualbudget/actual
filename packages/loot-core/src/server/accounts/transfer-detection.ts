import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { batchMessages } from '#server/sync';
import { linkTransfer } from '#server/transactions/transfer';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import type { TransactionEntity } from '#types/models';
import type { SyncedPrefs } from '#types/prefs';

// The two sides of a transfer don't always post on the same day, for example
// when the transfer is made right before a weekend.
const TRANSFER_DATE_WINDOW_DAYS = 3;

type TransferSide = Pick<
  TransactionEntity,
  'id' | 'account' | 'amount' | 'date'
> & {
  // A bank transaction imported again after the user deleted it is never
  // linked. Turning one side of a transfer back into a normal transaction
  // deletes the other side, which the next bank sync then imports again;
  // linking it again would undo the user's correction.
  reimported: boolean;
};

// Only transactions with one of the given amounts are read, so a sync that
// covers a long history doesn't load every transaction of that period.
async function getLinkableTransactions(
  from: string,
  to: string,
  amounts: number[],
): Promise<TransferSide[]> {
  const rows = await db.all<
    Pick<
      db.DbViewTransactionInternalAlive,
      'id' | 'account' | 'amount' | 'date'
    > & {
      reimported: 0 | 1;
    }
  >(
    `SELECT t.id, t.account, t.amount, t.date,
            EXISTS (SELECT 1 FROM v_transactions_internal d
                      WHERE d.tombstone = 1 AND d.account = t.account
                        AND d.imported_id = t.imported_id) AS reimported
       FROM v_transactions_internal_alive t
       JOIN accounts a ON a.id = t.account
       WHERE t.date >= ? AND t.date <= ? AND t.transfer_id IS NULL
         AND t.amount IN (${amounts.map(() => '?').join(',')})
         AND t.is_parent IS NOT 1 AND t.is_child IS NOT 1
         AND t.starting_balance_flag IS NOT 1 AND t.reconciled IS NOT 1
         AND a.closed IS NOT 1 AND a.tombstone IS NOT 1`,
    [db.toDateRepr(from), db.toDateRepr(to), ...amounts],
  );

  return rows.map(row => ({
    ...row,
    date: db.fromDateRepr(row.date),
    reimported: row.reimported === 1,
  }));
}

/**
 * Links the transfers among transactions that were just imported, if the
 * experimental feature is on. Returns the ids of the transactions on the
 * other side of the new transfers.
 */
export async function linkImportedTransfers(
  ids: Array<TransactionEntity['id']>,
): Promise<Array<TransactionEntity['id']>> {
  const { data } = await aqlQuery(
    q('preferences')
      .filter({
        id: 'flags.transferDetection' satisfies keyof SyncedPrefs,
      })
      .select('value'),
  );
  if (String(data?.[0]?.value) !== 'true') {
    return [];
  }
  return linkDetectedTransfers(ids);
}

/**
 * Links each of the given transactions to the transaction on the other side
 * of the transfer with linkTransfer, the same way "Make transfer" does.
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
        .filter({ id: { $oneof: transactionIds } })
        .select(['date', 'amount']),
    );
  const imported = data.filter(transaction => transaction.amount !== 0);
  if (imported.length === 0) {
    return [];
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
  const pairs: Array<[TransferSide, TransferSide]> = [];

  for (const transaction of linkable) {
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

    if (transaction.reimported || counterpart.reimported) {
      continue;
    }

    pairs.push([transaction, counterpart]);
    linkedIds.add(transaction.id).add(counterpart.id);
  }

  await batchMessages(async () => {
    for (const [transaction, counterpart] of pairs) {
      await linkTransfer(transaction, counterpart);
    }
  });

  return pairs.map(([, counterpart]) => counterpart.id);
}
