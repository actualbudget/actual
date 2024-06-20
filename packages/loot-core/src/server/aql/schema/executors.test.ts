// @ts-strict-ignore
import { setClock } from '@actual-app/crdt';
import fc from 'fast-check';

import * as arbs from '../../../mocks/arbitrary-schema';
import { q } from '../../../shared/query';
import { groupById } from '../../../shared/util';
import * as db from '../../db';
import { batchMessages, setSyncingMode } from '../../sync/index';

import { isHappyPathQuery } from './executors';
import { runQuery } from './run-query';

beforeEach(global.emptyDatabase());

function repeat(arr, times) {
  let result = [];
  for (let i = 0; i < times; i++) {
    result = result.concat(arr);
  }
  return result;
}

function isAlive(trans, allById) {
  if (trans.parent_id) {
    const parent = allById[trans.parent_id];
    return !trans.tombstone && parent && !parent.tombstone;
  }
  return !trans.tombstone;
}

function aliveTransactions(arr) {
  const all = groupById(arr);
  return arr.filter(t => isAlive(t, all));
}

async function insertTransactions(transactions, payeeIds?: string[]) {
  return batchMessages(async () => {
    for (const trans of transactions) {
      db.insertTransaction(trans);
    }

    if (payeeIds) {
      for (let i = 0; i < payeeIds.length; i++) {
        await db.insertPayee({
          id: payeeIds[i],
          name: 'payee' + (i + 1),
        });
      }
    }
  });
}

function expectTransactionOrder(
  data,
  fields?: Array<string | Record<string, string>>,
) {
  const expectedFields = fields || [
    { date: 'desc' },
    'starting_balance_flag',
    { sort_order: 'desc' },
    'id',
  ];

  const sorted = [...data].sort((i1, i2) => {
    for (let field of expectedFields) {
      let order = 'asc';
      if (!(typeof field === 'string')) {
        const entries = Object.entries(field)[0];
        field = entries[0];
        order = entries[1];
      }

      const f1 = i1[field];
      const f2 = i2[field];
      const before = order === 'asc' ? -1 : 1;
      const after = order === 'asc' ? 1 : -1;

      expect(f1).not.toBeUndefined();
      expect(f2).not.toBeUndefined();

      if (f1 == null && f2 != null) {
        return before;
      } else if (f1 != null && f2 == null) {
        return after;
      } else if (f1 < f2) {
        return before;
      } else if (f1 > f2) {
        return after;
      }
    }
    return 0;
  });

  expect(data.map(t => t.id)).toEqual(sorted.map(t => t.id));
}

async function expectPagedData(query, numTransactions, allData) {
  const pageCount = Math.max(Math.floor(numTransactions / 3), 3);
  let pagedData = [];
  let done = false;

  let i = 0;

  do {
    // No more than 100 loops, c'mon!
    expect(i).toBeLessThanOrEqual(100);

    // Pull in all the data via pages
    const { data } = await runQuery(
      query.limit(pageCount).offset(pagedData.length).serialize(),
    );

    expect(data.length).toBeLessThanOrEqual(pageCount);

    if (data.length === 0) {
      done = true;
    } else {
      pagedData = pagedData.concat(data);
    }

    i++;
  } while (!done);

  // All of the paged data together should be exactly the
  // same as the full data
  expect(pagedData).toEqual(allData);
}

describe('transaction executors', () => {
  it('queries with `splits: inline` returns only non-parents', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbs.makeTransactionArray({
          splitFreq: 2,
          minLength: 2,
          maxLength: 20,
        }),
        async arr => {
          await insertTransactions(arr);

          const { data } = await runQuery(
            q('transactions')
              .filter({ amount: { $lt: 0 } })
              .select('*')
              .options({ splits: 'inline' })
              .serialize(),
          );

          expect(data.filter(t => t.is_parent).length).toBe(0);
          expect(data.filter(t => t.tombstone).length).toBe(0);

          const { data: defaultData } = await runQuery(
            q('transactions')
              .filter({ amount: { $lt: 0 } })
              .select('*')
              .serialize(),
          );

          // inline should be the default
          expect(defaultData).toEqual(data);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('queries with `splits: none` returns only parents', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbs.makeTransactionArray({
          splitFreq: 2,
          minLength: 2,
          maxLength: 8,
        }),
        async arr => {
          await insertTransactions(arr);

          const { data } = await runQuery(
            q('transactions')
              .filter({ amount: { $lt: 0 } })
              .select('*')
              .options({ splits: 'none' })
              .serialize(),
          );

          expect(data.filter(t => t.is_child).length).toBe(0);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('aggregate queries work with `splits: grouped`', async () => {
    const payeeIds = ['payee1', 'payee2', 'payee3', 'payee4', 'payee5'];

    await fc.assert(
      fc
        .asyncProperty(
          arbs.makeTransactionArray({ splitFreq: 2, payeeIds, maxLength: 100 }),
          async arr => {
            await insertTransactions(arr, payeeIds);

            const aggQuery = q('transactions')
              .filter({
                $or: [{ amount: { $lt: -5 } }, { amount: { $gt: -2 } }],
                'payee.name': { $gt: '' },
              })
              .options({ splits: 'grouped' })
              .calculate({ $sum: '$amount' });

            const { data } = await runQuery(aggQuery.serialize());

            const sum = aliveTransactions(arr).reduce((sum, trans) => {
              const amount = trans.amount || 0;
              const matched =
                (amount < -5 || amount > -2) && trans.payee != null;
              if (!trans.tombstone && !trans.is_parent && matched) {
                return sum + amount;
              }
              return sum;
            }, 0);

            expect(data).toBe(sum);
          },
        )
        .beforeEach(() => {
          setClock(null);
          setSyncingMode('import');
          return db.execQuery(`
            DELETE FROM transactions;
            DELETE FROM payees;
            DELETE FROM payee_mapping;
          `);
        }),
    );
  });

  function runTest(makeQuery) {
    const payeeIds = ['payee1', 'payee2', 'payee3', 'payee4', 'payee5'];

    async function check(arr) {
      const orderFields = ['payee.name', 'amount', 'id'];

      // Insert transactions and get a list of all the alive
      // ones to make it easier to check the data later (don't
      // have to always be filtering out dead ones)
      await insertTransactions(arr, payeeIds);
      const allTransactions = aliveTransactions(arr);

      // Query time
      const { query, expectedIds, expectedMatchedIds } = makeQuery(arr);

      // First to a query without order to make sure the default
      // order works
      const { data: defaultOrderData } = await runQuery(query.serialize());
      expectTransactionOrder(defaultOrderData);
      expect(new Set(defaultOrderData.map(t => t.id))).toEqual(expectedIds);

      // Now do the full test, and add a custom order to make
      // sure that doesn't effect anything
      const orderedQuery = query.orderBy(orderFields);
      const { data } = await runQuery(orderedQuery.serialize());
      expect(new Set(data.map(t => t.id))).toEqual(expectedIds);

      // Validate paging and ordering
      await expectPagedData(orderedQuery, arr.length, data);
      expectTransactionOrder(data, orderFields);

      const matchedIds = new Set();

      // Check that all the subtransactions were returned
      for (const trans of data) {
        expect(trans.tombstone).toBe(false);

        if (expectedMatchedIds) {
          if (!trans._unmatched) {
            expect(expectedMatchedIds.has(trans.id)).toBe(true);
            matchedIds.add(trans.id);
          } else {
            expect(expectedMatchedIds.has(trans.id)).not.toBe(true);
          }
        }

        if (trans.is_parent) {
          // Parent transactions should never have a category
          expect(trans.category).toBe(null);

          expect(trans.subtransactions.length).toBe(
            allTransactions.filter(t => t.parent_id === trans.id).length,
          );

          // Subtransactions should be ordered as well
          expectTransactionOrder(trans.subtransactions, orderFields);

          trans.subtransactions.forEach(subtrans => {
            expect(subtrans.tombstone).toBe(false);

            if (expectedMatchedIds) {
              if (!subtrans._unmatched) {
                expect(expectedMatchedIds.has(subtrans.id)).toBe(true);
                matchedIds.add(subtrans.id);
              } else {
                expect(expectedMatchedIds.has(subtrans.id)).not.toBe(true);
              }
            }
          });
        }
      }

      if (expectedMatchedIds) {
        // Check that transactions that should be matched are
        // marked as such
        expect(matchedIds).toEqual(expectedMatchedIds);
      }
    }

    return fc.assert(
      fc
        .asyncProperty(
          arbs.makeTransactionArray({
            splitFreq: 0.1,
            payeeIds,
            maxLength: 100,
          }),
          check,
        )
        .beforeEach(() => {
          setClock(null);
          setSyncingMode('import');
          return db.execQuery(`
            DELETE FROM transactions;
            DELETE FROM payees;
            DELETE FROM payee_mapping;
          `);
        }),
      { numRuns: 300 },
    );
  }

  it('queries the correct transactions without filters', async () => {
    return runTest(arr => {
      const expectedIds = new Set(
        arr.filter(t => !t.tombstone && !t.is_child).map(t => t.id),
      );

      // Even though we're applying some filters, these are always
      // guaranteed to return the full split transaction so they
      // should take the optimized path
      const happyQuery = q('transactions')
        .filter({
          date: { $gt: '2017-01-01' },
        })
        .options({ splits: 'grouped' })
        .select(['*', 'payee.name']);

      // Make sure it's actually taking the happy path
      expect(isHappyPathQuery(happyQuery.serialize())).toBe(true);

      return {
        expectedIds,
        query: happyQuery,
      };
    });
  });

  it(`queries the correct transactions with a filter`, async () => {
    return runTest(arr => {
      const expectedIds = new Set();

      // let parents = toGroup(
      //   arr.filter(t => t.is_parent),
      //   new Map(Object.entries(groupById(arr.filter(t => t.parent_id))))
      // );

      const parents = groupById(arr.filter(t => t.is_parent && !t.tombstone));
      const matched = new Set();

      // Pick out some ids to query
      let ids = arr.reduce((ids, trans, idx) => {
        if (idx % 2 === 0) {
          const amount = trans.amount == null ? 0 : trans.amount;
          const matches = (amount < -2 || amount > -1) && trans.payee > '';

          if (matches && isAlive(trans, parents)) {
            expectedIds.add(trans.parent_id || trans.id);
            matched.add(trans.id);
          }

          ids.push(trans.id);
        }

        return ids;
      }, []);

      // Because why not? It should deduplicate them
      ids = repeat(ids, 100);

      const unhappyQuery = q('transactions')
        .filter({
          id: [{ $oneof: ids }],
          payee: { $gt: '' },
          $or: [{ amount: { $lt: -2 } }, { amount: { $gt: -1 } }],
        })
        .options({ splits: 'grouped' })
        .select(['*', 'payee.name'])
        // Using this because we want `payee` to have ids for the above
        // filter regardless if it points to a dead one or not
        .withoutValidatedRefs();

      expect(isHappyPathQuery(unhappyQuery.serialize())).toBe(false);

      return {
        expectedIds,
        expectedMatchedIds: matched,
        query: unhappyQuery,
      };
    });
  });
});
