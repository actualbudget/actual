import { batchUpdateTransactions } from '../accounts/transactions';
import { createApp } from '../app';
import * as db from '../db';
import { runMutator } from '../mutators';

let app = createApp();

app.method('tools/fix-split-transactions', async () => {
  // 1. Check for child transactions that have a blank payee, and set
  //    the payee to whatever the parent has
  let blankPayeeRows = await db.all(`
    SELECT t.*, p.payee AS parentPayee FROM v_transactions_internal t
    LEFT JOIN v_transactions_internal p ON t.parent_id = p.id
    WHERE t.is_child = 1 AND t.payee IS NULL AND p.payee IS NOT NULL
  `);

  await runMutator(async () => {
    let updated = blankPayeeRows.map(row => ({
      id: row.id,
      payee: row.parentPayee
    }));
    await batchUpdateTransactions({ updated });
  });

  // 2. Make sure the "cleared" flag is synced up with the parent
  // transactions
  let clearedRows = await db.all(`
    SELECT t.id, p.cleared FROM v_transactions_internal t
    LEFT JOIN v_transactions_internal p ON t.parent_id = p.id
    WHERE t.is_child = 1 AND t.cleared != p.cleared
  `);

  await runMutator(async () => {
    let updated = clearedRows.map(row => ({
      id: row.id,
      cleared: row.cleared === 1
    }));
    await batchUpdateTransactions({ updated });
  });

  // 3. Mark the `tombstone` field as true on any child transactions
  //    that have a dead parent
  let deletedRows = await db.all(`
    SELECT t.* FROM v_transactions_internal t
    LEFT JOIN v_transactions_internal p ON t.parent_id = p.id
    WHERE t.is_child = 1 AND t.tombstone = 0 AND (p.tombstone = 1 OR p.id IS NULL)
  `);

  await runMutator(async () => {
    let updated = deletedRows.map(row => ({ id: row.id, tombstone: 1 }));
    await batchUpdateTransactions({ updated });
  });

  return {
    numBlankPayees: blankPayeeRows.length,
    numCleared: clearedRows.length,
    numDeleted: deletedRows.length
  };
});

export default app;
