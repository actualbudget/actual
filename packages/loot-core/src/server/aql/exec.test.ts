// @ts-strict-ignore
import { v4 as uuidv4 } from 'uuid';

import * as db from '#server/db';
import { q } from '#shared/query';
import { makeChild } from '#shared/transactions';

import * as aql from './exec';
import { schema, schemaConfig } from './schema';

beforeEach(global.emptyDatabase());

function repeat(arr, times) {
  let result = [];
  for (let i = 0; i < times; i++) {
    result = result.concat(arr);
  }
  return result;
}

function compileAndRunAqlQuery(query, options?: unknown) {
  return aql.compileAndRunAqlQuery(schema, schemaConfig, query, options);
}

async function insertTransactions(repeatTimes = 1) {
  let transactions = [];
  const group = await db.insertCategoryGroup({ name: 'group' });

  for (let i = 0; i < repeatTimes; i++) {
    const cat1 = await db.insertCategory({
      id: 'cat' + i + 'a',
      name: 'cat' + i + 'a',
      cat_group: group,
    });
    const cat2 = await db.insertCategory({
      id: 'cat' + i + 'b',
      name: 'cat' + i + 'b',
      cat_group: group,
    });

    const parent = {
      id: uuidv4(),
      account: 'acct',
      date: '2020-01-04',
      amount: -100,
      is_parent: true,
    };
    const parent2 = {
      id: uuidv4(),
      account: 'acct',
      date: '2020-01-01',
      amount: -89,
      is_parent: true,
    };

    transactions = transactions.concat([
      parent,
      makeChild(parent, { amount: -20, category: cat1 }),
      makeChild(parent, { amount: -5, category: cat1 }),
      makeChild(parent, { amount: -30, category: cat1 }),
      makeChild(parent, { amount: -45, category: cat2 }),
      parent2,
      makeChild(parent2, { amount: -9, category: cat2 }),
      makeChild(parent2, { amount: -80, category: cat1 }),
      { account: 'acct', date: '2020-01-03', amount: -53, category: cat1 },
    ]);
  }

  for (const trans of transactions) {
    await db.insertTransaction(trans);
  }
}

describe('compileAndRunQuery', () => {
  it('converts output types', async () => {
    await insertTransactions();

    // date
    let { data } = await compileAndRunAqlQuery(
      q('transactions').select('date').serialize(),
    );
    expect(data[0].date).toBe('2020-01-04');

    // date-month
    data = (
      await compileAndRunAqlQuery(
        q('transactions')
          .select({ month: { $month: '$date' } })
          .serialize(),
      )
    ).data;
    expect(data[0].month).toBe('2020-01');

    // date-year
    data = (
      await compileAndRunAqlQuery(
        q('transactions')
          .select({ year: { $year: '$date' } })
          .serialize(),
      )
    ).data;
    expect(data[0].year).toBe('2020');

    // boolean
    data = (
      await compileAndRunAqlQuery(
        q('transactions').select(['is_child', 'is_parent']).raw().serialize(),
      )
    ).data;
    expect(data[0].is_child).toBe(false);
    expect(data[0].is_parent).toBe(true);
    expect(data[1].is_child).toBe(true);
    expect(data[1].is_parent).toBe(false);
  });

  it('$monthNum extracts month number 1-12', async () => {
    await insertTransactions();
    const { data } = await compileAndRunAqlQuery(
      q('transactions')
        .select({ month: { $monthNum: '$date' } })
        .serialize(),
    );
    expect(data[0].month).toBe(1);
  });

  it('$dayOfMonth extracts day number 1-31', async () => {
    await insertTransactions();
    const { data } = await compileAndRunAqlQuery(
      q('transactions')
        .select(['date', { day: { $dayOfMonth: '$date' } }])
        .serialize(),
    );
    for (const row of data) {
      const expectedDay = parseInt(row.date.slice(8, 10), 10);
      expect(row.day).toBe(expectedDay);
    }
  });

  it('$quarter extracts quarter 1-4', async () => {
    await insertTransactions();
    const { data } = await compileAndRunAqlQuery(
      q('transactions')
        .select({ q: { $quarter: '$date' } })
        .serialize(),
    );
    // January → Q1
    expect(data[0].q).toBe(1);
  });

  it('$monthName returns short month name', async () => {
    await insertTransactions();
    const { data } = await compileAndRunAqlQuery(
      q('transactions')
        .select(['date', { name: { $monthName: '$date' } }])
        .serialize(),
    );
    for (const row of data) {
      const expectedName = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ][parseInt(row.date.slice(5, 7), 10) - 1];
      expect(row.name).toBe(expectedName);
    }
  });

  it('$dayOfWeek returns day of week 0-6', async () => {
    await insertTransactions();
    const { data } = await compileAndRunAqlQuery(
      q('transactions')
        .select(['date', { dow: { $dayOfWeek: '$date' } }])
        .serialize(),
    );
    for (const row of data) {
      const expectedDow = new Date(row.date).getDay();
      expect(row.dow).toBe(expectedDow);
    }
  });

  it('groups by $monthNum and aggregates across months', async () => {
    await db.insertAccount({ id: 'acct', name: 'acct' });
    await db.insertTransaction({
      account: 'acct',
      date: '2020-01-15',
      amount: -1000,
    });
    await db.insertTransaction({
      account: 'acct',
      date: '2020-02-15',
      amount: -2000,
    });
    await db.insertTransaction({
      account: 'acct',
      date: '2020-03-10',
      amount: -3000,
    });
    const { data } = await compileAndRunAqlQuery(
      q('transactions')
        .groupBy({ $monthNum: '$date' })
        .select([
          { month: { $monthNum: '$date' } },
          { total: { $sum: '$amount' } },
        ])
        .serialize(),
    );
    expect(data).toHaveLength(3);
    expect(data.find(r => r.month === 1).total).toBe(-1000);
    expect(data.find(r => r.month === 2).total).toBe(-2000);
    expect(data.find(r => r.month === 3).total).toBe(-3000);
  });

  it('groups by $quarter and aggregates across months', async () => {
    await db.insertAccount({ id: 'acct', name: 'acct' });
    await db.insertTransaction({
      account: 'acct',
      date: '2020-01-15',
      amount: -1000,
    });
    await db.insertTransaction({
      account: 'acct',
      date: '2020-04-10',
      amount: -4000,
    });
    const { data } = await compileAndRunAqlQuery(
      q('transactions')
        .groupBy({ $quarter: '$date' })
        .select([{ q: { $quarter: '$date' } }, { total: { $sum: '$amount' } }])
        .serialize(),
    );
    expect(data).toHaveLength(2);
    expect(data.find(r => r.q === 1).total).toBe(-1000);
    expect(data.find(r => r.q === 2).total).toBe(-4000);
  });

  it('provides named parameters and converts types', async () => {
    const transId = uuidv4();
    await db.insertTransaction({
      id: transId,
      account: 'acct',
      date: '2020-01-01',
      amount: -5001,
      cleared: true,
    });

    let { data } = await compileAndRunAqlQuery(
      q('transactions')
        .filter({ amount: { $lt: { $neg: ':amount' } } })
        .select()
        .serialize(),
      { params: { amount: 5000 } },
    );
    expect(data[0].id).toBe(transId);

    data = (
      await compileAndRunAqlQuery(
        q('transactions')
          .filter({ date: { $transform: '$month', $eq: { $month: ':month' } } })
          .select('date')
          .serialize(),
        { params: { month: '2020-01-02' } },
      )
    ).data;
    expect(data[0].id).toBe(transId);

    data = (
      await compileAndRunAqlQuery(
        q('transactions')
          .filter({ date: { $transform: '$year', $eq: { $year: ':month' } } })
          .select('date')
          .serialize(),
        { params: { month: '2020-01-02' } },
      )
    ).data;
    expect(data[0].id).toBe(transId);

    data = (
      await compileAndRunAqlQuery(
        q('transactions')
          .filter({ cleared: ':cleared' })
          .select('date')
          .serialize(),
        { params: { cleared: true } },
      )
    ).data;
    expect(data[0].id).toBe(transId);
  });

  it('allows null as a parameter', async () => {
    await db.insertCategoryGroup({ id: 'group', name: 'group' });
    await db.insertCategory({ id: 'cat', name: 'cat', cat_group: 'group' });
    await db.insertCategory({ id: 'cat2', name: 'cat2', cat_group: 'group' });
    const transNoCat = await db.insertTransaction({
      account: 'acct',
      date: '2020-01-01',
      amount: -5001,
      category: null,
    });
    const transCat = await db.insertTransaction({
      account: 'acct',
      date: '2020-01-01',
      amount: -5001,
      category: 'cat',
    });
    const transCat2 = await db.insertTransaction({
      account: 'acct',
      date: '2020-01-02',
      amount: -5001,
      category: 'cat2',
    });

    const queryState = q('transactions')
      .filter({ category: ':category' })
      .select()
      .serialize();

    let { data } = await compileAndRunAqlQuery(queryState, {
      params: { category: null },
    });
    expect(data[0].id).toBe(transNoCat);

    data = (
      await compileAndRunAqlQuery(queryState, { params: { category: 'cat' } })
    ).data;
    expect(data[0].id).toBe(transCat);

    data = (
      await compileAndRunAqlQuery(
        q('transactions')
          .filter({ category: { $ne: ':category' } })
          .select('category')
          .serialize(),

        { params: { category: 'cat2' } },
      )
    ).data;
    expect(data).toHaveLength(2);
    expect(data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: transNoCat }),
        expect.objectContaining({ id: transCat }),
        expect.not.objectContaining({ id: transCat2 }),
      ]),
    );

    data = (
      await compileAndRunAqlQuery(
        q('transactions')
          .filter({ category: { $ne: ':category' } })
          .select('category')
          .serialize(),
        { params: { category: null } },
      )
    ).data;
    expect(data).toHaveLength(2);
    expect(data).toEqual(
      expect.arrayContaining([
        expect.not.objectContaining({ id: transNoCat }),
        expect.objectContaining({ id: transCat }),
        expect.objectContaining({ id: transCat2 }),
      ]),
    );
  });

  it('parameters have the correct order', async () => {
    const transId = uuidv4();
    await db.insertTransaction({
      id: transId,
      account: 'acct',
      date: '2020-01-01',
      amount: -5001,
    });

    const { data } = await compileAndRunAqlQuery(
      q('transactions')
        .filter({
          amount: { $lt: { $neg: ':amount' } },
          date: [{ $lte: ':date' }, { $gte: ':date' }],
        })
        .select()
        .serialize(),
      { params: { amount: 5000, date: '2020-01-01' } },
    );
    expect(data[0].id).toBe(transId);
  });

  it('fetches all data required for $oneof', async () => {
    await insertTransactions();

    const rows = await db.all<Pick<db.DbTransaction, 'id'>>(
      'SELECT id FROM transactions WHERE amount < -50',
    );
    const ids = rows.slice(0, 3).map(row => row.id);
    ids.sort((a, b) => String(a).localeCompare(String(b)));

    const { data } = await compileAndRunAqlQuery(
      q('transactions')
        .filter({ id: { $oneof: repeat(ids, 1000) }, amount: { $lt: 50 } })
        .select('id')
        .raw()
        .serialize(),
    );
    expect(
      data
        .map(row => row.id)
        .sort((a, b) => String(a).localeCompare(String(b))),
    ).toEqual(ids);
  });

  it('returns column metadata', async () => {
    await insertTransactions();

    const { columns } = await compileAndRunAqlQuery(
      q('transactions').select(['date', 'amount', 'category']).serialize(),
    );

    expect(columns).toBeDefined();
    expect(columns!.length).toBeGreaterThanOrEqual(3);
    expect(columns!.find(c => c.name === 'date')).toEqual({
      name: 'date',
      type: 'date',
    });
    expect(columns!.find(c => c.name === 'amount')).toEqual({
      name: 'amount',
      type: 'integer',
    });
    expect(columns!.find(c => c.name === 'category')).toEqual({
      name: 'category',
      type: 'id',
    });
  });
});

describe('Conditional aggregates (exec)', () => {
  it('$sumIf sums only rows matching the condition', async () => {
    await insertTransactions();
    // We have one positive transaction (the -53 is negative; check that
    // the conditional sum correctly partitions).
    const queryState = q('transactions')
      .select([
        { positive: { $sumIf: [{ amount: { $gt: 0 } }, '$amount'] } },
        { negative: { $sumIf: [{ amount: { $lt: 0 } }, '$amount'] } },
      ])
      .serialize();
    const result = await compileAndRunAqlQuery(queryState);
    // All inserted transactions are negative, so the positive sum is 0
    // and the negative sum is the total of all amounts.
    expect(result.data[0].positive).toBe(0);
    expect(result.data[0].negative).toBeLessThan(0);
  });

  it('$countIf counts only rows matching the condition', async () => {
    await insertTransactions();
    const { data } = await compileAndRunAqlQuery(
      q('transactions')
        .select([{ negative_count: { $countIf: { amount: { $lt: 0 } } } }])
        .serialize(),
    );
    // All inserted transactions are negative.
    expect(data[0].negative_count).toBeGreaterThan(0);
  });

  it('$avgIf averages only rows matching the condition', async () => {
    await db.insertCategoryGroup({ name: 'g' });
    const cat = await db.insertCategory({ name: 'c', cat_group: 'g' });
    await db.insertTransaction({
      account: 'acct',
      date: '2020-01-01',
      amount: 100,
      category: cat,
    });
    await db.insertTransaction({
      account: 'acct',
      date: '2020-01-01',
      amount: 200,
      category: cat,
    });
    await db.insertTransaction({
      account: 'acct',
      date: '2020-01-01',
      amount: -50,
      category: cat,
    });

    const { data } = await compileAndRunAqlQuery(
      q('transactions')
        .select([
          { avg_positive: { $avgIf: [{ amount: { $gt: 0 } }, '$amount'] } },
        ])
        .serialize(),
    );
    // Only the +100 and +200 are averaged → 150
    expect(data[0].avg_positive).toBe(150);
  });

  it('$avg, $min, $max work on a column', async () => {
    await db.insertTransaction({
      account: 'acct',
      date: '2020-01-01',
      amount: 100,
    });
    await db.insertTransaction({
      account: 'acct',
      date: '2020-01-05',
      amount: 300,
    });
    await db.insertTransaction({
      account: 'acct',
      date: '2020-01-03',
      amount: 200,
    });

    const { data } = await compileAndRunAqlQuery(
      q('transactions')
        .select([
          { avg: { $avg: '$amount' } },
          { min: { $min: '$amount' } },
          { max: { $max: '$amount' } },
        ])
        .serialize(),
    );
    expect(data[0].avg).toBe(200);
    expect(data[0].min).toBe(100);
    expect(data[0].max).toBe(300);
  });

  it('$countDistinct counts unique values', async () => {
    await db.insertAccount({ id: 'acct1', name: 'acct1' });
    await db.insertAccount({ id: 'acct2', name: 'acct2' });
    await db.insertTransaction({
      account: 'acct1',
      date: '2020-01-01',
      amount: 100,
    });
    await db.insertTransaction({
      account: 'acct1',
      date: '2020-01-02',
      amount: 200,
    });
    await db.insertTransaction({
      account: 'acct2',
      date: '2020-01-03',
      amount: 300,
    });

    const { data } = await compileAndRunAqlQuery(
      q('transactions')
        .select([{ unique_accounts: { $countDistinct: '$account' } }])
        .serialize(),
    );
    expect(data[0].unique_accounts).toBe(2);
  });
});

describe('$week date bucketing (exec)', () => {
  it('groups transactions by ISO week', async () => {
    // Two transactions in the same week, one in a different week
    await db.insertAccount({ id: 'acct', name: 'acct' });
    await db.insertTransaction({
      account: 'acct',
      date: '2024-01-01', // Monday
      amount: 10,
    });
    await db.insertTransaction({
      account: 'acct',
      date: '2024-01-05', // Friday same week
      amount: 20,
    });
    await db.insertTransaction({
      account: 'acct',
      date: '2024-01-15', // Next week
      amount: 30,
    });

    const { data } = await compileAndRunAqlQuery(
      q('transactions')
        .groupBy({ $week: '$date' })
        .select([{ week: { $week: '$date' } }, { total: { $sum: '$amount' } }])
        .orderBy({ $week: '$date' })
        .serialize(),
    );

    expect(data).toHaveLength(2);
    // First week total = 30 (10+20)
    expect(data[0].total).toBe(30);
    // Second week total = 30
    expect(data[1].total).toBe(30);
    // The two weeks should be different strings
    expect(data[0].week).not.toBe(data[1].week);
  });
});
