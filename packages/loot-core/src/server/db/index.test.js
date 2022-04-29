import * as db from './index';

beforeEach(global.emptyDatabase());

async function insertTransactions(transactions) {
  await db.insertAccount({ id: 'foo', name: 'bar' });
  return Promise.all(
    transactions.map(transaction => db.insertTransaction(transaction))
  );
}

async function getTransactions(latestDate) {
  const rows = await db.getTransactions('foo');
  return rows
    .filter(t => t.date <= latestDate)
    .map(row => ({
      id: row.id,
      date: row.date,
      payee: row.payee,
      is_child: row.is_child,
      is_parent: row.is_parent,
      amount: row.amount,
      starting_balance_flag: row.starting_balance_flag,
      sort_order: row.sort_order
    }));
}

// TODO: test that `insertTransaction` is done sync (or is at least
// validated in the same event loop and it's same to not await)

describe('Database', () => {
  test('inserting a category works', async () => {
    await db.insertCategoryGroup({ id: 'group1', name: 'group1' });
    await db.insertCategory({
      name: 'foo',
      cat_group: 'group1'
    });
    expect((await db.getCategories()).length).toBe(1);
  });

  test('transactions are sorted by date', async () => {
    await insertTransactions([
      { date: '2018-01-05', account: 'foo', amount: -23 },
      { date: '2018-01-02', account: 'foo', amount: -24 },
      { date: '2018-01-04', account: 'foo', amount: 12 },
      { date: '2018-01-01', account: 'foo', amount: 2 },
      { date: '2018-01-03', account: 'foo', amount: -5 }
    ]);
    expect(await getTransactions('2018-01-05')).toMatchSnapshot();
  });

  test('transactions are sorted by starting balance flag', async () => {
    // The transaction with a starting balance flag should always be
    // at the end of any transactions of the same day (it sorts by
    // date first, so any earlier transactions will be before it)
    await insertTransactions([
      { date: '2018-01-05', account: 'foo', amount: -23 },
      {
        date: '2018-01-03',
        account: 'foo',
        amount: 12,
        starting_balance_flag: 1
      },
      { date: '2018-01-03', account: 'foo', amount: -25 },
      { date: '2018-01-03', account: 'foo', amount: -5 }
    ]);
    expect(await getTransactions('2018-01-05')).toMatchSnapshot();
  });

  test('transactions are sorted by sort order', async () => {
    // Transactions on the same day should sort by sort order descending
    await insertTransactions([
      { date: '2018-01-05', account: 'foo', amount: -23, sort_order: 5 },
      { date: '2018-01-03', account: 'foo', amount: -24, sort_order: 8 },
      { date: '2018-01-03', account: 'foo', amount: 12, sort_order: 2 },
      { date: '2018-01-03', account: 'foo', amount: 2, sort_order: 4 },
      { date: '2018-01-03', account: 'foo', amount: -5, sort_order: 1 }
    ]);
    expect(await getTransactions('2018-01-05')).toMatchSnapshot();
  });

  test('transactions are sorted by id as a last resort', async () => {
    // Transactions on the same day should sort by sort order descending
    await insertTransactions([
      { date: '2018-01-05', account: 'foo', amount: -23, sort_order: 5 },
      {
        id: 'foo3',
        date: '2018-01-03',
        account: 'foo',
        amount: -24,
        sort_order: 4
      },
      {
        id: 'foo1',
        date: '2018-01-03',
        account: 'foo',
        amount: 12,
        sort_order: 4
      },
      {
        id: 'foo2',
        date: '2018-01-03',
        account: 'foo',
        amount: 2,
        sort_order: 4
      }
    ]);
    expect(await getTransactions('2018-01-05')).toMatchSnapshot();
  });

  test('transactions get child transactions in the right order', async () => {
    // Transactions on the same day should sort by sort order descending
    await insertTransactions([
      { date: '2018-01-05', account: 'foo', amount: -23, sort_order: 5 },
      {
        id: 'foo',
        date: '2018-01-03',
        account: 'foo',
        amount: -24,
        sort_order: 8,
        is_parent: true
      },
      {
        id: 'child3',
        date: '2018-01-03',
        account: 'foo',
        amount: -5,
        sort_order: 7.97,
        is_child: true,
        parent_id: 'foo'
      },
      {
        id: 'child1',
        date: '2018-01-03',
        account: 'foo',
        amount: 12,
        sort_order: 7.99,
        is_child: true,
        parent_id: 'foo'
      },
      {
        id: 'child2',
        date: '2018-01-03',
        account: 'foo',
        amount: 2,
        sort_order: 7.98,
        is_child: true,
        parent_id: 'foo'
      }
    ]);
    expect(await getTransactions('2018-01-05')).toMatchSnapshot();
  });

  test("transactions don't show orphaned child transactions", async () => {
    await insertTransactions([
      { date: '2018-01-05', account: 'foo', amount: -23, sort_order: 5 },
      {
        id: 'foo/child3',
        date: '2018-01-03',
        account: 'foo',
        amount: -5,
        sort_order: 7.97,
        is_child: true
      },
      {
        id: 'foo/child1',
        date: '2018-01-03',
        account: 'foo',
        amount: 12,
        sort_order: 7.99,
        is_child: true
      },
      {
        id: 'foo/child2',
        date: '2018-01-03',
        account: 'foo',
        amount: 2,
        sort_order: 7.98,
        is_child: true
      }
    ]);
    expect(await getTransactions('2018-01-05')).toMatchSnapshot();
  });

  test('parent transactions never have a category', async () => {
    await db.insertCategoryGroup({ id: 'group1', name: 'group1' });
    await db.insertCategory({
      id: 'cat1',
      name: 'cat1',
      cat_group: 'group1'
    });
    await db.insertCategory({
      id: 'cat2',
      name: 'cat2',
      cat_group: 'group1'
    });

    await insertTransactions([
      { date: '2018-01-05', account: 'foo', amount: -23, sort_order: 5 },
      {
        id: 'parent1',
        date: '2018-01-03',
        account: 'foo',
        category: 'cat1',
        amount: -24,
        sort_order: 8,
        is_parent: true
      },
      {
        id: 'child3',
        date: '2018-01-03',
        account: 'foo',
        category: 'cat1',
        amount: -5,
        sort_order: 7.97,
        is_child: true,
        parent_id: 'parent1'
      },
      {
        id: 'child2',
        date: '2018-01-03',
        account: 'foo',
        category: 'cat2',
        amount: 2,
        sort_order: 7.98,
        is_child: true,
        parent_id: 'parent1'
      }
    ]);

    const rows = await db.getTransactions('foo');

    expect(rows.find(t => t.id === 'parent1').category).toBe(null);
    expect(rows.find(t => t.id === 'child3').category).toBe('cat1');
    expect(rows.find(t => t.id === 'child2').category).toBe('cat2');
  });

  test('child transactions never appear if parent is deleted', async () => {
    await insertTransactions([
      {
        id: 'trans1',
        date: '2018-01-05',
        account: 'foo',
        amount: -23,
        sort_order: 5
      },
      {
        id: 'parent1',
        date: '2018-01-03',
        account: 'foo',
        category: 'cat1',
        amount: -24,
        sort_order: 8,
        is_parent: true
      },
      {
        id: 'child3',
        date: '2018-01-03',
        account: 'foo',
        category: 'cat1',
        amount: -5,
        sort_order: 7.97,
        is_child: true,
        parent_id: 'parent1'
      },
      {
        id: 'child2',
        date: '2018-01-03',
        account: 'foo',
        category: 'cat2',
        amount: 2,
        sort_order: 7.98,
        is_child: true,
        parent_id: 'parent1'
      }
    ]);

    await db.deleteTransaction({ id: 'parent1' });

    const rows = await db.getTransactions('foo');
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe('trans1');
  });
});
