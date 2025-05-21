// @ts-strict-ignore
import { TransactionEntity } from '../../types/models';
import * as db from '../db';

import { mergeTransactions } from './merge';

describe('Merging fails for invalid quantity', () => {
  beforeEach(global.emptyDatabase());
  afterEach(global.emptyDatabase());

  const tests: [TransactionEntity[], string][] = [
    [[{} as TransactionEntity], 'one transaction'],
    [[], 'no transactions'],
    [undefined as unknown as TransactionEntity[], 'undefined'],
    [[{}, {}, {}] as TransactionEntity[], 'three transactions'],
    [
      [{}, undefined] as TransactionEntity[],
      'two transactions but one is undefined',
    ],
  ];
  tests.forEach(([arr, message]) =>
    it(message, () => expect(() => mergeTransactions(arr)).rejects.toThrow()),
  );

  it("fails when amounts don't match", async () => {
    await prepareDatabase();
    const t1 = await db.insertTransaction({
      account: 'one',
      date: '2025-01-01',
      amount: 10,
    });
    const t2 = await db.insertTransaction({
      account: 'one',
      date: '2025-01-01',
      amount: 12,
    });
    expect(() => mergeTransactions([{ id: t1 }, { id: t2 }])).rejects.toThrow(
      'Transaction amounts must match for merge',
    );
  });

  it("fails when transaction id doesn't exist", async () => {
    await prepareDatabase();
    const t1 = await db.insertTransaction({
      account: 'one',
      date: '2025-01-01',
      amount: 10,
    });
    expect(() =>
      mergeTransactions([{ id: t1 }, { id: 'missing' }]),
    ).rejects.toThrow('One of the provided transactions does not exist');
  });
});

async function prepareDatabase() {
  await db.insertCategoryGroup({ id: 'group1', name: 'group1', is_income: 0 });
  await db.insertCategory({
    id: '1',
    name: 'cat1',
    cat_group: 'group1',
    is_income: 0,
  });
  await db.insertCategory({
    id: '2',
    name: 'cat2',
    cat_group: 'group1',
    is_income: 0,
  });
  await db.insertAccount({ id: 'one', name: 'one' });
  await db.insertAccount({ id: 'two', name: 'two' });
  await db.insertAccount({ id: 'three', name: 'three', offbudget: 1 });
  await db.insertPayee({ id: 'payee1', name: 'one' });
  await db.insertPayee({ id: 'payee2', name: 'two' });
  await db.insertPayee({ id: 'payee3', name: 'three' });
}

function getAllTransactions() {
  return db.all<db.DbViewTransaction & { payee_name: db.DbPayee['name'] }>(
    `SELECT t.*, p.name as payee_name
       FROM v_transactions t
       LEFT JOIN payees p ON p.id = t.payee
       ORDER BY date DESC, amount DESC, id
     `,
  );
}

describe('Merging success', () => {
  beforeEach(global.emptyDatabase());
  beforeEach(prepareDatabase);
  afterEach(global.emptyDatabase());
  const transaction1 = {
    account: 'one',
    date: '2025-01-01',
    payee: 'payee1',
    notes: 'notes1',
    category: '1',
    amount: 5,
    cleared: false,
    reconciled: false,
  } as TransactionEntity;

  const dbTransaction1 = {
    account: 'one',
    date: 20250101,
    payee: 'payee1',
    notes: 'notes1',
    category: '1',
    amount: 5,
    cleared: 1,
    reconciled: 1,
  } as db.DbViewTransaction;

  const transaction2 = {
    account: 'two',
    date: '2025-02-02',
    payee: 'payee2',
    notes: 'notes2',
    category: '2',
    amount: 5,
    cleared: true,
    reconciled: true,
  } as TransactionEntity;

  const dbTransaction2 = {
    account: 'two',
    date: 20250202,
    payee: 'payee2',
    notes: 'notes2',
    category: '2',
    amount: 5,
    cleared: 1,
    reconciled: 1,
  } as db.DbViewTransaction;

  it('two banksynced transactions keeps older transaction', async () => {
    const t1 = await db.insertTransaction({
      ...transaction1,
      imported_id: 'imported_1',
    });
    const t2 = await db.insertTransaction({
      ...transaction2,
      imported_id: 'imported_2',
    });

    expect(await mergeTransactions([{ id: t1 }, { id: t2 }])).toBe(t1);

    const transactions = await getAllTransactions();
    expect(transactions.length).toBe(1);
    expect(transactions[0]).toMatchObject({
      ...dbTransaction1,
      imported_id: 'imported_1',
    });
  });

  it('first banksynced, second manual keeps banksynced values', async () => {
    const t1 = await db.insertTransaction({
      ...transaction1,
      imported_id: 'imported_1',
    });
    const t2 = await db.insertTransaction(transaction2);

    expect(await mergeTransactions([{ id: t1 }, { id: t2 }])).toBe(t1);

    const transactions = await getAllTransactions();
    expect(transactions.length).toBe(1);
    expect(transactions[0]).toMatchObject({
      ...dbTransaction1,
      imported_id: 'imported_1',
    });
  });

  it('first file imported, second banksycned keeps banksynced values', async () => {
    const t1 = await db.insertTransaction({
      ...transaction1,
      imported_payee: 'payee',
    });
    const t2 = await db.insertTransaction({
      ...transaction2,
      imported_id: 'imported_2',
    });

    expect(await mergeTransactions([{ id: t1 }, { id: t2 }])).toBe(t2);

    const transactions = await getAllTransactions();
    expect(transactions.length).toBe(1);
    expect(transactions[0]).toMatchObject({
      ...dbTransaction2,
      imported_id: 'imported_2',
    });
  });

  it('second file imported, first banksycned keeps banksynced values', async () => {
    const t1 = await db.insertTransaction({
      ...transaction1,
      imported_id: 'imported_1',
    });
    const t2 = await db.insertTransaction({
      ...transaction2,
      imported_payee: 'payee',
    });

    expect(await mergeTransactions([{ id: t1 }, { id: t2 }])).toBe(t1);

    const transactions = await getAllTransactions();
    expect(transactions.length).toBe(1);
    expect(transactions[0]).toMatchObject({
      ...dbTransaction1,
      imported_id: 'imported_1',
    });
  });

  it('second file imported, first manual keeps file imported values', async () => {
    const t1 = await db.insertTransaction(transaction1);
    const t2 = await db.insertTransaction({
      ...transaction2,
      imported_payee: 'payee',
    });

    expect(await mergeTransactions([{ id: t1 }, { id: t2 }])).toBe(t2);

    const transactions = await getAllTransactions();
    expect(transactions.length).toBe(1);
    expect(transactions[0]).toMatchObject({
      ...dbTransaction2,
      imported_payee: 'payee',
    });
  });

  it('first file imported, second manual keeps file imported values', async () => {
    const t1 = await db.insertTransaction({
      ...transaction1,
      imported_payee: 'payee',
    });
    const t2 = await db.insertTransaction(transaction2);

    expect(await mergeTransactions([{ id: t1 }, { id: t2 }])).toBe(t1);

    const transactions = await getAllTransactions();
    expect(transactions.length).toBe(1);
    expect(transactions[0]).toMatchObject({
      ...dbTransaction1,
      imported_payee: 'payee',
    });
  });

  it('second banksynced, first manual keeps banksynced values', async () => {
    const t1 = await db.insertTransaction(transaction1);
    const t2 = await db.insertTransaction({
      ...transaction2,
      imported_id: 'imported_2',
    });

    expect(await mergeTransactions([{ id: t1 }, { id: t2 }])).toBe(t2);

    const transactions = await getAllTransactions();
    expect(transactions.length).toBe(1);
    expect(transactions[0]).toMatchObject({
      ...dbTransaction2,
      imported_id: 'imported_2',
    });
  });

  it('missing values in keep are filled in with drop values', async () => {
    // only insert required fields, imported to be kept
    const t1 = await db.insertTransaction({
      account: 'one',
      amount: 5,
      date: '2025-01-01',
      imported_id: 'imported_1',
    });
    const t2 = await db.insertTransaction(transaction2);

    expect(await mergeTransactions([{ id: t1 }, { id: t2 }])).toBe(t1);
    const transactions = await getAllTransactions();
    expect(transactions.length).toBe(1);
    expect(transactions[0]).toMatchObject({
      ...dbTransaction2,
      // values that should be kept from t1
      id: t1,
      account: 'one',
      amount: 5,
      date: 20250101,
      imported_id: 'imported_1',
    });
  });
});
