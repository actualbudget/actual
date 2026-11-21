import { beforeEach, describe, expect, it } from 'vitest';

import * as db from '#server/db';

import { deferTransaction, splitAmount } from './defer';

beforeEach(global.emptyDatabase());

async function prepareDatabase() {
  await db.insertCategoryGroup({ id: 'group1', name: 'group1', is_income: 0 });
  await db.insertCategory({
    id: 'cat1',
    name: 'cat1',
    cat_group: 'group1',
    is_income: 0,
  });
  await db.insertAccount({ id: 'checking', name: 'Checking' });
  await db.insertPayee({ name: '', transfer_acct: 'checking' });
  const payee = await db.insertPayee({ name: 'Insurance Co' });
  await db.insertTransaction({
    id: 'prepaid',
    account: 'checking',
    amount: -120001,
    payee,
    category: 'cat1',
    notes: 'Annual premium',
    date: '2024-01-31',
  });
  return payee;
}

function getTransactions() {
  return db.all<db.DbViewTransaction>(
    'SELECT * FROM v_transactions WHERE tombstone = 0 ORDER BY date, account, amount DESC',
  );
}

describe('splitAmount', () => {
  it('spreads leftover cents over the first parts', () => {
    expect(splitAmount(-1000, 3)).toEqual([-334, -333, -333]);
    expect(splitAmount(1200, 12)).toEqual(Array(12).fill(100));
  });
});

describe('deferTransaction', () => {
  it('turns the transaction into a transfer and adds monthly payments', async () => {
    const payee = await prepareDatabase();

    const { prepaidAccountId } = await deferTransaction({
      id: 'prepaid',
      months: 3,
      prepaidAccountName: 'Prepaid Expenses',
    });

    const account = await db.getAccount(prepaidAccountId);
    expect(account).toMatchObject({ name: 'Prepaid Expenses', offbudget: 0 });

    const transactions = await getTransactions();
    const original = transactions.find(t => t.id === 'prepaid');
    expect(original).toMatchObject({
      account: 'checking',
      amount: -120001,
      category: null,
    });
    expect(original?.transfer_id).toBeTruthy();

    const prepaid = transactions.filter(t => t.account === prepaidAccountId);
    expect(
      prepaid.map(({ date, amount, payee, category, notes }) => ({
        date,
        amount,
        payee,
        category,
        notes,
      })),
    ).toEqual([
      {
        date: 20240131,
        amount: 120001,
        payee: expect.any(String),
        category: null,
        notes: 'Annual premium',
      },
      {
        date: 20240131,
        amount: -40001,
        payee,
        category: 'cat1',
        notes: 'Annual premium (1/3)',
      },
      {
        date: 20240229,
        amount: -40000,
        payee,
        category: 'cat1',
        notes: 'Annual premium (2/3)',
      },
      {
        date: 20240331,
        amount: -40000,
        payee,
        category: 'cat1',
        notes: 'Annual premium (3/3)',
      },
    ]);
  });

  it('reuses an existing prepaid account and honors the start month', async () => {
    await prepareDatabase();
    await db.insertAccount({ id: 'existing', name: 'Prepaid Expenses' });
    await db.insertPayee({ name: '', transfer_acct: 'existing' });

    const { prepaidAccountId } = await deferTransaction({
      id: 'prepaid',
      months: 2,
      startMonth: '2024-03',
      prepaidAccountName: 'Prepaid Expenses',
    });

    expect(prepaidAccountId).toBe('existing');
    const dates = (await getTransactions())
      .filter(t => t.account === 'existing' && t.category === 'cat1')
      .map(t => t.date);
    expect(dates).toEqual([20240331, 20240430]);
  });

  it('remembers the prepaid account by id so it can be renamed', async () => {
    await prepareDatabase();
    await db.insertTransaction({
      id: 'second',
      account: 'checking',
      amount: -2400,
      category: 'cat1',
      date: '2024-02-15',
    });

    const { prepaidAccountId } = await deferTransaction({
      id: 'prepaid',
      months: 2,
      prepaidAccountName: 'Prepaid Expenses',
    });
    const pref = await db.first<Pick<db.DbPreference, 'value'>>(
      "SELECT value FROM preferences WHERE id = 'prepaid-account'",
    );
    expect(pref?.value).toBe(prepaidAccountId);

    await db.updateAccount({ id: prepaidAccountId, name: 'Annual bills' });
    const second = await deferTransaction({
      id: 'second',
      months: 2,
      prepaidAccountName: 'Prepaid Expenses',
    });

    expect(second.prepaidAccountId).toBe(prepaidAccountId);
    const accounts = await db.all<db.DbAccount>(
      'SELECT * FROM accounts WHERE tombstone = 0',
    );
    expect(accounts).toHaveLength(2);
  });

  it('creates a new prepaid account when the remembered one is closed', async () => {
    await prepareDatabase();
    const { prepaidAccountId } = await deferTransaction({
      id: 'prepaid',
      months: 2,
      prepaidAccountName: 'Prepaid Expenses',
    });
    await db.updateAccount({ id: prepaidAccountId, closed: 1 });
    await db.insertTransaction({
      id: 'second',
      account: 'checking',
      amount: -2400,
      category: 'cat1',
      date: '2024-02-15',
    });

    const second = await deferTransaction({
      id: 'second',
      months: 2,
      prepaidAccountName: 'Prepaid Expenses',
    });

    expect(second.prepaidAccountId).not.toBe(prepaidAccountId);
    const pref = await db.first<Pick<db.DbPreference, 'value'>>(
      "SELECT value FROM preferences WHERE id = 'prepaid-account'",
    );
    expect(pref?.value).toBe(second.prepaidAccountId);
  });

  it('does not remember an account when deferring within it fails', async () => {
    await prepareDatabase();
    await db.insertAccount({ id: 'manual', name: 'Prepaid Expenses' });
    await db.insertPayee({ name: '', transfer_acct: 'manual' });
    await db.insertTransaction({
      id: 'inside',
      account: 'manual',
      amount: -2400,
      category: 'cat1',
      date: '2024-02-15',
    });

    await expect(
      deferTransaction({
        id: 'inside',
        months: 2,
        prepaidAccountName: 'Prepaid Expenses',
      }),
    ).rejects.toThrow('within the prepaid account');

    const pref = await db.first<Pick<db.DbPreference, 'value'>>(
      "SELECT value FROM preferences WHERE id = 'prepaid-account'",
    );
    expect(pref).toBeNull();
  });

  it('rejects transactions in off-budget accounts', async () => {
    await prepareDatabase();
    await db.updateAccount({ id: 'checking', offbudget: 1 });

    await expect(
      deferTransaction({
        id: 'prepaid',
        months: 12,
        prepaidAccountName: 'Prepaid Expenses',
      }),
    ).rejects.toThrow('off-budget');

    const accounts = await db.all<db.DbAccount>(
      "SELECT * FROM accounts WHERE name = 'Prepaid Expenses'",
    );
    expect(accounts).toEqual([]);
  });

  it('rejects reconciled transactions', async () => {
    await prepareDatabase();
    await db.updateTransaction({ id: 'prepaid', reconciled: true });

    await expect(
      deferTransaction({
        id: 'prepaid',
        months: 12,
        prepaidAccountName: 'Prepaid Expenses',
      }),
    ).rejects.toThrow('Reconciled');
  });

  it('rejects an invalid start month without creating the prepaid account', async () => {
    await prepareDatabase();

    await expect(
      deferTransaction({
        id: 'prepaid',
        months: 12,
        startMonth: 'invalid',
        prepaidAccountName: 'Prepaid Expenses',
      }),
    ).rejects.toThrow('Invalid start month');

    const accounts = await db.all<db.DbAccount>(
      "SELECT * FROM accounts WHERE name = 'Prepaid Expenses'",
    );
    expect(accounts).toEqual([]);
  });

  it('rejects uncategorized transactions', async () => {
    await prepareDatabase();
    await db.updateTransaction({ id: 'prepaid', category: null });

    await expect(
      deferTransaction({
        id: 'prepaid',
        months: 12,
        prepaidAccountName: 'Prepaid Expenses',
      }),
    ).rejects.toThrow('categorized');
  });
});
