import query from '../../shared/query';
import { makeChild } from '../../shared/transactions';
import * as db from '../db';

import * as aql from './exec';
import { schema, schemaConfig } from './schema';

const uuid = require('../../platform/uuid');

beforeEach(global.emptyDatabase());

function repeat(arr, times) {
  let result = [];
  for (let i = 0; i < times; i++) {
    result = result.concat(arr);
  }
  return result;
}

function runQuery(query, options) {
  return aql.runQuery(schema, schemaConfig, query, options);
}

async function insertTransactions(repeatTimes = 1) {
  let transactions = [];
  let group = await db.insertCategoryGroup({ name: 'group' });

  for (let i = 0; i < repeatTimes; i++) {
    let cat1 = await db.insertCategory({
      id: 'cat' + i + 'a',
      name: 'cat' + i + 'a',
      cat_group: group
    });
    let cat2 = await db.insertCategory({
      id: 'cat' + i + 'b',
      name: 'cat' + i + 'b',
      cat_group: group
    });

    let parent = {
      id: uuid.v4Sync(),
      account: 'acct',
      date: '2020-01-04',
      amount: -100,
      is_parent: true
    };
    let parent2 = {
      id: uuid.v4Sync(),
      account: 'acct',
      date: '2020-01-01',
      amount: -89,
      is_parent: true
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
      { account: 'acct', date: '2020-01-03', amount: -53, category: cat1 }
    ]);
  }

  for (let trans of transactions) {
    await db.insertTransaction(trans);
  }
}

describe('runQuery', () => {
  it('converts output types', async () => {
    await insertTransactions();

    // date
    let { data } = await runQuery(
      query('transactions').select('date').serialize()
    );
    expect(data[0].date).toBe('2020-01-04');

    // date-month
    data = (
      await runQuery(
        query('transactions')
          .select({ month: { $month: '$date' } })
          .serialize()
      )
    ).data;
    expect(data[0].month).toBe('2020-01');

    // date-year
    data = (
      await runQuery(
        query('transactions')
          .select({ year: { $year: '$date' } })
          .serialize()
      )
    ).data;
    expect(data[0].year).toBe('2020');

    // boolean
    data = (
      await runQuery(
        query('transactions')
          .select(['is_child', 'is_parent'])
          .raw()
          .serialize()
      )
    ).data;
    expect(data[0].is_child).toBe(false);
    expect(data[0].is_parent).toBe(true);
    expect(data[1].is_child).toBe(true);
    expect(data[1].is_parent).toBe(false);
  });

  it('provides named parameters and converts types', async () => {
    let transId = uuid.v4Sync();
    await db.insertTransaction({
      id: transId,
      account: 'acct',
      date: '2020-01-01',
      amount: -5001,
      cleared: true
    });

    let { data } = await runQuery(
      query('transactions')
        .filter({ amount: { $lt: { $neg: ':amount' } } })
        .select()
        .serialize(),
      { params: { amount: 5000 } }
    );
    expect(data[0].id).toBe(transId);

    data = (
      await runQuery(
        query('transactions')
          .filter({ date: { $transform: '$month', $eq: { $month: ':month' } } })
          .select('date')
          .serialize(),
        { params: { month: '2020-01-02' } }
      )
    ).data;
    expect(data[0].id).toBe(transId);

    data = (
      await runQuery(
        query('transactions')
          .filter({ date: { $transform: '$year', $eq: { $year: ':month' } } })
          .select('date')
          .serialize(),
        { params: { month: '2020-01-02' } }
      )
    ).data;
    expect(data[0].id).toBe(transId);

    data = (
      await runQuery(
        query('transactions')
          .filter({ cleared: ':cleared' })
          .select('date')
          .serialize(),
        { params: { cleared: true } }
      )
    ).data;
    expect(data[0].id).toBe(transId);
  });

  it('allows null as a parameter', async () => {
    await db.insertCategoryGroup({ id: 'group', name: 'group' });
    await db.insertCategory({ id: 'cat', name: 'cat', cat_group: 'group' });
    let transNoCat = await db.insertTransaction({
      account: 'acct',
      date: '2020-01-01',
      amount: -5001,
      category: null
    });
    let transCat = await db.insertTransaction({
      account: 'acct',
      date: '2020-01-01',
      amount: -5001,
      category: 'cat'
    });

    let queryState = query('transactions')
      .filter({ category: ':category' })
      .select()
      .serialize();

    let { data } = await runQuery(queryState, { params: { category: null } });
    expect(data[0].id).toBe(transNoCat);

    data = (await runQuery(queryState, { params: { category: 'cat' } })).data;
    expect(data[0].id).toBe(transCat);
  });

  it('parameters have the correct order', async () => {
    let transId = uuid.v4Sync();
    await db.insertTransaction({
      id: transId,
      account: 'acct',
      date: '2020-01-01',
      amount: -5001
    });

    let { data } = await runQuery(
      query('transactions')
        .filter({
          amount: { $lt: { $neg: ':amount' } },
          date: [{ $lte: ':date' }, { $gte: ':date' }]
        })
        .select()
        .serialize(),
      { params: { amount: 5000, date: '2020-01-01' } }
    );
    expect(data[0].id).toBe(transId);
  });

  it('fetches all data required for $oneof', async () => {
    await insertTransactions();

    let rows = await db.all('SELECT id FROM transactions WHERE amount < -50');
    let ids = rows.slice(0, 3).map(row => row.id);
    ids.sort();

    let { data } = await runQuery(
      query('transactions')
        .filter({ id: { $oneof: repeat(ids, 1000) }, amount: { $lt: 50 } })
        .select('id')
        .raw()
        .serialize()
    );
    expect(data.map(row => row.id).sort()).toEqual(ids);
  });
});
