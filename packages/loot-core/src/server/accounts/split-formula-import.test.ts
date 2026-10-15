import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { createSchedule } from '#server/schedules/app';
import { insertRule, loadRules } from '#server/transactions/transaction-rules';

import { reconcileTransactions } from './sync';

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await loadRules();
});

test('import keeps one parent, matches its schedule and transfers only the formula split', async () => {
  await db.insertAccount({ id: 'source', name: 'Source', offbudget: 0 });
  await db.insertAccount({
    id: 'destination',
    name: 'Destination',
    offbudget: 1,
  });
  await db.insertPayee({
    id: 'transfer-source',
    name: '',
    transfer_acct: 'source',
  });
  await db.insertPayee({
    id: 'transfer-destination',
    name: '',
    transfer_acct: 'destination',
  });
  await db.insertPayee({ id: 'bank', name: 'Bank' });
  await db.insertCategoryGroup({ id: 'group', name: 'Expenses', is_income: 0 });
  await db.insertCategory({
    id: 'category',
    name: 'Payment',
    cat_group: 'group',
    is_income: 0,
  });

  const schedule = await createSchedule({
    schedule: { name: 'Payment', posts_transaction: false },
    conditions: [
      { field: 'account', op: 'is', value: 'source' },
      { field: 'amount', op: 'isapprox', value: -3000 },
      {
        field: 'date',
        op: 'isapprox',
        value: { start: '2024-01-15', frequency: 'monthly', patterns: [] },
      },
      { field: 'notes', op: 'contains', value: 'ITEM:' },
    ],
  });
  await insertRule({
    stage: 'pre',
    conditionsOp: 'and',
    conditions: [
      { field: 'account', op: 'is', value: 'source' },
      { field: 'notes', op: 'contains', value: 'ITEM:' },
    ],
    actions: [
      {
        op: 'set-split-amount',
        value: null,
        options: {
          splitIndex: 1,
          method: 'formula',
          formula:
            '=-VALUE(MID(parent_notes, SEARCH("ITEM: ", parent_notes)+6, SEARCH("USD", parent_notes, SEARCH("ITEM: ", parent_notes))-SEARCH("ITEM: ", parent_notes)-6))',
        },
      },
      {
        op: 'set',
        field: 'payee',
        value: 'transfer-destination',
        options: { splitIndex: 1 },
      },
      {
        op: 'set',
        field: 'category',
        value: 'category',
        options: { splitIndex: 1 },
      },
      {
        op: 'set-split-amount',
        value: null,
        options: { splitIndex: 2, method: 'remainder' },
      },
      { op: 'set', field: 'payee', value: 'bank', options: { splitIndex: 2 } },
      {
        op: 'set',
        field: 'category',
        value: 'category',
        options: { splitIndex: 2 },
      },
    ],
  });

  const imported = {
    date: '2024-01-15',
    amount: -3000,
    imported_id: 'bank-import-id',
    notes: 'Payment in USD: ITEM: 25.50USD FEE: 4.50USD',
    imported_payee: 'Imported bank',
    cleared: true,
  };
  await reconcileTransactions('source', [imported]);
  const read = () =>
    db.all<db.DbViewTransactionInternal>(
      'SELECT * FROM v_transactions_internal',
    );
  const rows = await read();
  const parent = rows.find(row => row.is_parent);
  if (!parent) throw new Error('Missing split parent');
  expect(parent).toMatchObject({
    account: 'source',
    imported_id: imported.imported_id,
    notes: imported.notes,
    imported_payee: imported.imported_payee,
    amount: -3000,
    cleared: 1,
    schedule,
  });
  const children = rows.filter(row => row.parent_id === parent.id);
  expect(children).toHaveLength(2);
  expect(children).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        amount: -2550,
        payee: 'transfer-destination',
        category: 'category',
        cleared: 1,
      }),
      expect.objectContaining({
        amount: -450,
        payee: 'bank',
        category: 'category',
        cleared: 1,
      }),
    ]),
  );
  expect(children.reduce((sum, row) => sum + row.amount, 0)).toBe(
    parent.amount,
  );
  const destination = rows.filter(row => row.account === 'destination');
  expect(destination).toHaveLength(1);
  expect(destination[0]).toMatchObject({
    amount: 2550,
    transfer_id: children.find(row => row.amount === -2550)?.id,
  });
  expect(rows).toHaveLength(4);

  // A repeated bank import must preserve identity and not create another transfer.
  await reconcileTransactions('source', [imported]);
  const reimported = await read();
  expect(reimported.map(row => row.id).sort()).toEqual(
    rows.map(row => row.id).sort(),
  );
  expect(reimported.find(row => row.id === parent.id)).toMatchObject({
    imported_id: imported.imported_id,
    notes: imported.notes,
    schedule,
  });
  expect(
    reimported
      .filter(row => row.account === 'destination')
      .reduce((sum, row) => sum + row.amount, 0),
  ).toBe(2550);
});
