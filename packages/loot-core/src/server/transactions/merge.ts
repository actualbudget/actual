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

  // Load subtransactions with a single query, then split by parent_id in memory
  const keepSubtransactions: TransactionEntity[] = [];
  const dropSubtransactions: TransactionEntity[] = [];
  const parentIds = [
    keep.is_parent ? keep.id : null,
    drop.is_parent ? drop.id : null,
  ].filter((v): v is string => Boolean(v));

  if (parentIds.length > 0) {
    const rows = await db.all<TransactionEntity>(
      `SELECT * FROM v_transactions WHERE parent_id IN (${parentIds
        .map(() => '?')
        .join(',')})`,
      parentIds,
    );
    for (const row of rows) {
      if (row.parent_id === keep.id) keepSubtransactions.push(row);
      else if (row.parent_id === drop.id) dropSubtransactions.push(row);
    }
  }

  // Determine which transaction has subtransactions (split categories)
  const keepHasSubtransactions = keepSubtransactions.length > 0;
  const dropHasSubtransactions = dropSubtransactions.length > 0;

  // If keep doesn't have subtransactions but drop does, transfer them
  if (!keepHasSubtransactions && dropHasSubtransactions) {
    // Update each subtransaction to point to the kept parent
    await Promise.all(
      dropSubtransactions.map(sub =>
        db.updateTransaction({
          id: sub.id,
          parent_id: keep.id,
        } as TransactionEntity),
      ),
    );
    // Mark keep as a parent transaction
    await db.updateTransaction({
      id: keep.id,
      is_parent: true,
      category: null, // Parent transactions with splits shouldn't have a category
      payee: keep.payee || drop.payee,
      notes: keep.notes || drop.notes,
      cleared: keep.cleared || drop.cleared,
      reconciled: keep.reconciled || drop.reconciled,
    } as unknown as TransactionEntity);
  } else {
    // Normal merge without subtransactions
    await db.updateTransaction({
      id: keep.id,
      payee: keep.payee || drop.payee,
      category: keep.category || drop.category,
      notes: keep.notes || drop.notes,
      cleared: keep.cleared || drop.cleared,
      reconciled: keep.reconciled || drop.reconciled,
    } as TransactionEntity);
  }

  // Delete the dropped transaction (this will also handle cleanup of any remaining subtransactions)
  await db.deleteTransaction(drop);

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
