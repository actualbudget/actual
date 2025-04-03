import { type TransactionEntity } from '../../types/models';
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
    txIds.map(db.getTransaction),
  );
  if (!a || !b) {
    throw new Error('One of the provided transactions does not exist');
  } else if (a.amount !== b.amount) {
    throw new Error('Transaction amounts must match for merge');
  }
  const { keep, drop } = determineKeepDrop(a, b);

  await Promise.all([
    db.updateTransaction({
      id: keep.id,
      date: keep.date || drop.date,
      payee: keep.payee || drop.payee,
      category: keep.category || drop.category,
      notes: keep.notes || drop.notes,
      imported_id: keep.imported_id || drop.imported_id,
    } as TransactionEntity),
    db.deleteTransaction(drop),
  ]);
  return keep.id;
}

function determineKeepDrop(
  a: TransactionEntity,
  b: TransactionEntity,
): { keep: TransactionEntity; drop: TransactionEntity } {
  // if one is imported and the other is manual, keep the manual transaction
  if (b.imported_id && !a.imported_id) {
    return { keep: a, drop: b };
  } else if (a.imported_id && !b.imported_id) {
    return { keep: b, drop: a };
  }

  // keep the earlier transaction
  if (a.date.localeCompare(b.date) < 0) {
    return { keep: a, drop: b };
  } else {
    return { keep: b, drop: a };
  }
}
