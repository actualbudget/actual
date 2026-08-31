import * as db from '#server/db';
import { batchUpdateTransactions } from '#server/transactions';
import * as transfer from '#server/transactions/transfer';
import {
  realizeTempTransactions,
  ungroupTransaction,
  updateTransaction,
} from '#shared/transactions';

beforeEach(global.emptyDatabase());

async function prepareDatabase() {
  await db.insertCategoryGroup({ id: 'group1', name: 'group1', is_income: 0 });
  await db.insertCategory({
    id: '1',
    name: 'cat1',
    cat_group: 'group1',
    is_income: 0,
  });
  await db.insertAccount({ id: 'one', name: 'one' });
  await db.insertAccount({ id: 'two', name: 'two' });
  await db.insertPayee({ name: '', transfer_acct: 'one' });
  await db.insertPayee({ name: '', transfer_acct: 'two' });
}

describe('Duplicate split with transfer date sync', () => {
  test('duplicating split with transfer and changing parent date syncs linked transfer date', async () => {
    await prepareDatabase();

    const payeeTwo = await db.first<db.DbPayee>(
      "SELECT * FROM payees WHERE transfer_acct = 'two'",
    );
    const normalPayee = await db.insertPayee({ name: 'Normal' });

    // Create split parent
    const parentId = await db.insertTransaction({
      account: 'one',
      amount: 5000,
      date: '2025-01-01',
      is_parent: true,
      category: null,
    });

    // Child 1 is a transfer to account two
    const child1Id = await db.insertTransaction({
      account: 'one',
      amount: 2000,
      date: '2025-01-01',
      payee: payeeTwo!.id,
      is_child: true,
      parent_id: parentId,
      category: null,
    });

    const child2Id = await db.insertTransaction({
      account: 'one',
      amount: 3000,
      date: '2025-01-01',
      payee: normalPayee,
      is_child: true,
      parent_id: parentId,
      category: '1',
    });

    // Create linked transfer for child1
    const child1 = await db.getTransaction(child1Id);
    await transfer.onInsert(child1);

    // Re-fetch to get updated transfer_id
    const freshChild1 = await db.getTransaction(child1Id);
    expect(freshChild1.transfer_id).toBeDefined();
    const originalTransferId = freshChild1.transfer_id;
    const originalTransfer = await db.getTransaction(originalTransferId!);
    expect(originalTransfer.date).toBe('2025-01-01');

    // Simulate duplication as done in useTransactionBatchActions.onBatchDuplicate
    // Fetch grouped transaction (parent with subtransactions)
    const parent = await db.getTransaction(parentId);
    const child1Fresh = await db.getTransaction(child1Id);
    const child2Fresh = await db.getTransaction(child2Id);
    // Grouped shape expected by realizeTempTransactions: need subtransactions field
    const grouped = {
      ...parent,
      subtransactions: [child1Fresh, child2Fresh],
    };

    // This is the OLD buggy path: realizeTempTransactions retains transfer_id
    // After fix, the hook should clear transfer_id and schedule.
    // Here we simulate the FIXED hook behavior: clearing transfer_id/schedule
    // The test should pass only when both layers are fixed: hook clears and updateTransfer syncs date.
    // To reproduce the bug, we first test without clearing and without date sync.
    // For this regression test, we use the FIXED duplication (cleared) and expect date sync.

    const duplicated = realizeTempTransactions(
      ungroupTransaction(grouped as any),
    ).map(t => ({
      ...t,
      cleared: false,
      reconciled: false,
      transfer_id: null,
      schedule: null,
    }));

    // Verify duplicate children have no transfer_id before insert
    expect(duplicated.find(t => t.is_child)!.transfer_id).toBeNull();

    // Insert duplicated split via batchUpdateTransactions (which triggers transfer.onInsert)
    await batchUpdateTransactions({ added: duplicated as any });

    // Find duplicated parent and its transfer child
    const allTransactions = await db.all<any>(
      `SELECT id, is_parent, is_child, parent_id, transfer_id, date, account FROM v_transactions WHERE tombstone = 0`,
    );
    const dupParentRow = allTransactions.find(
      r => r.is_parent === 1 && r.id !== parentId,
    );
    expect(dupParentRow).toBeDefined();
    const dupParentId = dupParentRow.id;

    const dupChildren = allTransactions.filter(
      r => r.parent_id === dupParentId,
    );
    expect(dupChildren.length).toBe(2);
    // Alternative: find child whose transfer counterpart exists in account two
    let dupTransferChildId: string | null = null;
    let dupLinkedTransferId: string | null = null;
    for (const c of dupChildren) {
      if (c.transfer_id) {
        const linked = await db.getTransaction(c.transfer_id);
        if (linked) {
          dupTransferChildId = c.id;
          dupLinkedTransferId = linked.id;
          break;
        }
      }
    }
    expect(dupTransferChildId).not.toBeNull();
    expect(dupLinkedTransferId).not.toBeNull();
    const dupLinkedBefore = await db.getTransaction(dupLinkedTransferId!);
    expect(dupLinkedBefore.date).toBe('2025-01-01');

    // Now change duplicated parent date via updateTransaction + batchUpdate (simulating UI edit)
    // Need to use shared updateTransaction to propagate date to children
    const dupParent = await db.getTransaction(dupParentId);
    const dupChild1 = await db.getTransaction(dupTransferChildId!);
    const dupChild2 = dupChildren.find(c => c.id !== dupTransferChildId);
    // Build transactions array as expected by updateTransaction (flat list sorted)
    // Simpler: use batchUpdate with updated parent date and rely on server transfer sync?
    // But split date propagation is done client-side via updateTransaction diff.
    const groupedDup = {
      ...dupParent,
      subtransactions: [dupChild1, await db.getTransaction(dupChild2!.id)],
    };
    const flat = ungroupTransaction(groupedDup as any);
    // Change parent date
    const newDate = '2025-02-15';
    const updatedParent = { ...dupParent, date: newDate };
    // Use shared logic to get diff (which updates children dates via makeChild)
    const { diff } = updateTransaction(flat as any, updatedParent as any);
    // diff.updated should contain parent and children with new date
    expect(diff.updated.length).toBeGreaterThan(0);
    // Apply via batchUpdateTransactions
    await batchUpdateTransactions({ updated: diff.updated as any });

    // After update, linked transfer date should equal new parent date
    const dupLinkedAfter = await db.getTransaction(dupLinkedTransferId!);
    expect(dupLinkedAfter.date).toBe(newDate);

    // Also ensure non-transfer split case doesn't break: duplicate non-transfer split and change date
    // Already covered by not throwing, but verify no linked transfer was incorrectly created
    const nonTransferChildAfter = await db.getTransaction(dupChild2!.id);
    expect(nonTransferChildAfter.transfer_id).toBeNull();
  });

  test('non-transfer split duplicate date change still works', async () => {
    await prepareDatabase();
    const normalPayee = await db.insertPayee({ name: 'Normal' });
    const parentId = await db.insertTransaction({
      account: 'one',
      amount: 5000,
      date: '2025-01-01',
      is_parent: true,
      category: null,
    });
    await db.insertTransaction({
      account: 'one',
      amount: 2000,
      date: '2025-01-01',
      payee: normalPayee,
      is_child: true,
      parent_id: parentId,
      category: '1',
    });
    await db.insertTransaction({
      account: 'one',
      amount: 3000,
      date: '2025-01-01',
      payee: normalPayee,
      is_child: true,
      parent_id: parentId,
      category: '1',
    });
    const parent = await db.getTransaction(parentId);
    const all = await db.all<any>(
      `SELECT * FROM v_transactions WHERE parent_id = ? AND tombstone = 0`,
      [parentId],
    );
    const grouped = {
      ...parent,
      subtransactions: await Promise.all(all.map(r => db.getTransaction(r.id))),
    };
    const duplicated = realizeTempTransactions(
      ungroupTransaction(grouped as any),
    ).map(t => ({
      ...t,
      cleared: false,
      reconciled: false,
      transfer_id: null,
      schedule: null,
    }));
    await batchUpdateTransactions({ added: duplicated as any });
    const allTransactions = await db.all<any>(
      `SELECT * FROM v_transactions WHERE is_parent = 1 AND tombstone = 0`,
    );
    const dupParentRow = allTransactions.find(r => r.id !== parentId);
    expect(dupParentRow).toBeDefined();
    const dupParentId = dupParentRow.id;
    const dupParent = await db.getTransaction(dupParentId);
    const dupChildrenRows = await db.all<any>(
      `SELECT * FROM v_transactions WHERE parent_id = ? AND tombstone = 0`,
      [dupParentId],
    );
    const groupedDup = {
      ...dupParent,
      subtransactions: await Promise.all(
        dupChildrenRows.map(r => db.getTransaction(r.id)),
      ),
    };
    const flat = ungroupTransaction(groupedDup as any);
    const newDate = '2025-03-01';
    const { diff } = updateTransaction(
      flat as any,
      {
        ...dupParent,
        date: newDate,
      } as any,
    );
    await batchUpdateTransactions({ updated: diff.updated as any });
    const updatedParent = await db.getTransaction(dupParentId);
    expect(updatedParent.date).toBe(newDate);
    const updatedChildren = await db.all<any>(
      `SELECT * FROM v_transactions WHERE parent_id = ? AND tombstone = 0`,
      [dupParentId],
    );
    for (const c of updatedChildren) {
      const t = await db.getTransaction(c.id);
      expect(t.date).toBe(newDate);
    }
  });
});
