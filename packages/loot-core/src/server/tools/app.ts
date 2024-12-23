// @ts-strict-ignore
import { q } from '../../shared/query';
import { batchUpdateTransactions } from '../accounts/transactions';
import { createApp } from '../app';
import { runQuery } from '../aql';
import * as db from '../db';
import { runMutator } from '../mutators';

import { ToolsHandlers } from './types/handlers';

export const app = createApp<ToolsHandlers>();

app.method('tools/fix-split-transactions', async () => {
  // 1. Check for child transactions that have a blank payee, and set
  //    the payee to whatever the parent has
  const blankPayeeRows = await db.all(`
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
  const clearedRows = await db.all(`
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
  const deletedRows = await db.all(`
    SELECT t.* FROM v_transactions_internal t
    LEFT JOIN v_transactions_internal p ON t.parent_id = p.id
    WHERE t.is_child = 1 AND t.tombstone = 0 AND (p.tombstone = 1 OR p.id IS NULL)
  `);

  await runMutator(async () => {
    const updated = deletedRows.map(row => ({ id: row.id, tombstone: 1 }));
    await batchUpdateTransactions({ updated });
  });

  const splitTransactions = (
    await runQuery(
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

  return {
    numBlankPayees: blankPayeeRows.length,
    numCleared: clearedRows.length,
    numDeleted: deletedRows.length,
    mismatchedSplits,
  };
});
