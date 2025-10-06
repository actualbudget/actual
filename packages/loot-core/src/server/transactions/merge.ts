import { q } from 'loot-core/shared/query';

import { type TransactionEntity } from '../../types/models';
import { aqlQuery } from '../aql';
import * as db from '../db';

export async function mergeTransactions(
  transactions: Pick<TransactionEntity, 'id'>[],
): Promise<TransactionEntity['id']> {
  // make sure all values have ids
  const txIds = transactions?.map(x => x?.id).filter(Boolean) || [];
  if (txIds.length !== 2) {
    throw new Error(
      'Merging is only possible with 2 transactions, but found ' +
        JSON.stringify(transactions),
    );
  }

  // get most recent transactions
  const [a, b]: TransactionEntity[] = await Promise.all(
    txIds.map(async id => {
      const { data } = await aqlQuery(
        q('transactions')
          .filter({ id })
          .select('*')
          .options({ splits: 'grouped' }),
      );
      return data[0];
    }),
  );

  if (!a || !b) {
    throw new Error('One of the provided transactions does not exist');
  } else if (a.amount !== b.amount) {
    throw new Error('Transaction amounts must match for merge');
  }
  const { keep, drop } = determineKeepDrop(a, b);

  const promises = [
    db.updateTransaction({
      id: keep.id,
      payee: keep.payee ?? drop.payee,
      category: keep.category ?? drop.category,
      notes: keep.notes ?? drop.notes,
      cleared: keep.cleared ?? drop.cleared,
      reconciled: keep.reconciled ?? drop.reconciled,
      is_parent: keep.is_parent || drop.is_parent,
    } as TransactionEntity),
    db.deleteTransaction(drop),
  ];

  // if drop has subtransactions and keep does not re-parent the subtransactions
  if (!keep.is_parent && drop.is_parent) {
    const updateSubTransactionPromises =
      drop.subtransactions?.map(t =>
        db.updateTransaction({
          id: t.id,
          parent_id: keep.id,
        } as TransactionEntity),
      ) ?? [];
    promises.push(...updateSubTransactionPromises);
  }

  // if both have subtransactions delete the ones from drop
  else if (keep.is_parent && drop.is_parent) {
    const deleteSubTransactionPromises =
      drop.subtransactions?.map(t => db.deleteTransaction(t)) ?? [];
    promises.push(...deleteSubTransactionPromises);
  }

  await Promise.all(promises);

  return keep.id;
}

function determineKeepDrop(
  a: TransactionEntity,
  b: TransactionEntity,
): { keep: TransactionEntity; drop: TransactionEntity } {
  // if one is imported through bank sync and the other is manual,
  // keep the imported transaction
  if (b.imported_id && !a.imported_id) {
    return { keep: b, drop: a };
  } else if (a.imported_id && !b.imported_id) {
    return { keep: a, drop: b };
  }

  // same logic but for imported transactions
  if (b.imported_payee && !a.imported_payee) {
    return { keep: b, drop: a };
  } else if (a.imported_payee && !b.imported_payee) {
    return { keep: a, drop: b };
  }

  // keep the earlier transaction
  if (a.date.localeCompare(b.date) < 0) {
    return { keep: a, drop: b };
  } else {
    return { keep: b, drop: a };
  }
}
