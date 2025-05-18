// @ts-strict-ignore
import { q } from '../../shared/query';
import { TransactionEntity } from '../../types/models';
import { createApp } from '../app';
import { aqlQuery } from '../aql';
import * as db from '../db';
import { runMutator } from '../mutators';
import { batchUpdateTransactions } from '../transactions';

export type ToolsHandlers = {
  'tools/fix-split-transactions': typeof fixSplitTransactions;
};

export const app = createApp<ToolsHandlers>();

app.method('tools/fix-split-transactions', fixSplitTransactions);

async function fixSplitTransactions(): Promise<{
  numBlankPayees: number;
  numCleared: number;
  numDeleted: number;
  numTransfersFixed: number;
  numNonParentErrorsFixed: number;
  numParentTransactionsWithCategoryFixed: number;
  mismatchedSplits: TransactionEntity[];
}> {
  // 1. Check for child transactions that have a blank payee, and set
  //    the payee to whatever the parent has
  const blankPayeeRows = await db.all<
    db.DbViewTransactionInternal & {
      parentPayee: db.DbViewTransactionInternal['payee'];
    }
  >(`
    SELECT t.*, p.payee AS parentPayee FROM v_transactions_internal t
    LEFT JOIN v_transactions_internal p ON t.parent_id = p.id
    WHERE t.is_child = 1 AND t.payee IS NULL AND p.payee IS NOT NULL
  `);

  await runMutator(async () => {
    const updated = blankPayeeRows.map(row => ({
      id: row.id,
      payee: row.parentPayee,
    }));
    await batchUpdateTransactions({ updated });
  });

  // 2. Make sure the "cleared" flag is synced up with the parent
  // transactions
  const clearedRows = await db.all<
    Pick<db.DbViewTransactionInternal, 'id'> &
      Pick<db.DbViewTransactionInternal, 'cleared'>
  >(`
    SELECT t.id, p.cleared FROM v_transactions_internal t
    LEFT JOIN v_transactions_internal p ON t.parent_id = p.id
    WHERE t.is_child = 1 AND t.cleared != p.cleared
  `);

  await runMutator(async () => {
    const updated = clearedRows.map(row => ({
      id: row.id,
      cleared: row.cleared === 1,
    }));
    await batchUpdateTransactions({ updated });
  });

  // 3. Mark the `tombstone` field as true on any child transactions
  //    that have a dead parent
  const deletedRows = await db.all<db.DbViewTransactionInternal>(`
    SELECT t.* FROM v_transactions_internal t
    LEFT JOIN v_transactions_internal p ON t.parent_id = p.id
    WHERE t.is_child = 1 AND t.tombstone = 0 AND (p.tombstone = 1 OR p.id IS NULL)
  `);

  await runMutator(async () => {
    const updated = deletedRows.map(row => ({ id: row.id, tombstone: true }));
    await batchUpdateTransactions({ updated });
  });

  const splitTransactions = (
    await aqlQuery(
      q('transactions')
        .options({ splits: 'grouped' })
        .filter({
          is_parent: true,
        })
        .select('*'),
    )
  ).data;

  const mismatchedSplits = splitTransactions.filter(t => {
    const subValue = t.subtransactions.reduce((acc, st) => acc + st.amount, 0);

    return subValue !== t.amount;
  });

  // 5. Fix transfers that should not have categories
  const brokenTransfers = await db.all<
    Pick<db.DbViewTransactionInternal, 'id'>
  >(`
    SELECT t1.id
    FROM v_transactions_internal t1
           JOIN accounts a1 ON t1.account = a1.id
           JOIN v_transactions_internal t2 ON t1.transfer_id = t2.id
           JOIN accounts a2 ON t2.account = a2.id
    WHERE a1.offbudget = a2.offbudget
      AND t1.category IS NOT NULL
  `);

  await runMutator(async () => {
    const updated = brokenTransfers.map(row => ({
      id: row.id,
      category: null,
    }));
    await batchUpdateTransactions({ updated });
  });

  // 6. Remove transaction errors from non-parent transactions
  const errorRows = await db.all<Pick<db.DbViewTransactionInternal, 'id'>>(`
    SELECT id FROM v_transactions_internal WHERE error IS NOT NULL AND is_parent = 0
  `);

  await runMutator(async () => {
    const updated = errorRows.map(({ id }) => ({ id, error: null }));
    await batchUpdateTransactions({ updated });
  });

  // 7. Clear categories of parent transactions
  const parentTransactionsWithCategory = await db.all<
    Pick<db.DbViewTransactionInternal, 'id'>
  >(`
    SELECT id FROM transactions WHERE isParent = 1 AND category IS NOT NULL
  `);

  await runMutator(async () => {
    const updated = parentTransactionsWithCategory.map(({ id }) => ({
      id,
      category: null,
    }));
    await batchUpdateTransactions({ updated });
  });

  return {
    numBlankPayees: blankPayeeRows.length,
    numCleared: clearedRows.length,
    numDeleted: deletedRows.length,
    numTransfersFixed: brokenTransfers.length,
    numNonParentErrorsFixed: errorRows.length,
    numParentTransactionsWithCategoryFixed:
      parentTransactionsWithCategory.length,
    mismatchedSplits,
  };
}
