import {
  splitTransaction,
  updateTransaction,
  deleteTransaction,
  addSplitTransaction,
  makeChild
} from './transactions';

const uuid = require('../platform/uuid');

// const data = {
//   splitTransactions: generateTransaction({ amount: -5000, acct: 2 }, -2000)
// };

function makeTransaction(data) {
  return {
    id: uuid.v4Sync(),
    amount: 2422,
    date: '2020-01-05',
    account: 'acct1',
    ...data
  };
}

function makeSplitTransaction(data, children) {
  let parent = makeTransaction({ ...data, is_parent: true });
  return [parent, ...children.map(t => makeChild(parent, t))];
}

function splitError(amount) {
  return { difference: amount, type: 'SplitTransactionError', version: 1 };
}

describe('Transactions', () => {
  test('updating a transaction works', () => {
    let transactions = [
      makeTransaction({ amount: 5000 }),
      makeTransaction({ id: 't1', amount: 4000 }),
      makeTransaction({ amount: 3000 })
    ];
    let { data, diff } = updateTransaction(transactions, {
      id: 't1',
      amount: 5000
    });
    expect(data.find(d => d.subtransactions)).toBeFalsy();
    expect(diff).toEqual({
      added: [],
      deleted: [],
      updated: [{ id: 't1', amount: 5000 }]
    });
    expect(data.map(t => ({ id: t.id, amount: t.amount })).sort()).toEqual([
      { id: expect.any(String), amount: 5000 },
      { id: 't1', amount: 5000 },
      { id: expect.any(String), amount: 3000 }
    ]);
  });

  test('updating does nothing if value not changed', () => {
    let transactions = [
      makeTransaction({ id: 't1', amount: 5000 }),
      makeTransaction({ amount: 3000 })
    ];
    let { data, diff } = updateTransaction(transactions, {
      id: 't1',
      amount: 5000
    });
    expect(diff).toEqual({ added: [], deleted: [], updated: [] });
    expect(data.map(t => ({ id: t.id, amount: t.amount })).sort()).toEqual([
      { id: expect.any(String), amount: 5000 },
      { id: expect.any(String), amount: 3000 }
    ]);
  });

  test('deleting a transaction works', () => {
    let transactions = [
      makeTransaction({ amount: 5000 }),
      makeTransaction({ id: 't1', amount: 4000 }),
      makeTransaction({ amount: 3000 })
    ];
    let { data, diff } = deleteTransaction(transactions, 't1');

    expect(diff).toEqual({
      added: [],
      deleted: [{ id: 't1' }],
      updated: []
    });
    expect(data.map(t => ({ id: t.id, amount: t.amount })).sort()).toEqual([
      { id: expect.any(String), amount: 5000 },
      { id: expect.any(String), amount: 3000 }
    ]);
  });

  test('splitting a transaction works', () => {
    let transactions = [
      makeTransaction({ id: 't1', amount: 5000 }),
      makeTransaction({ amount: 3000 })
    ];
    let { data, diff } = splitTransaction(transactions, 't1');
    expect(data.find(d => d.subtransactions)).toBeFalsy();

    expect(diff).toEqual({
      added: [expect.objectContaining({ amount: 0, parent_id: 't1' })],
      deleted: [],
      updated: [
        {
          id: 't1',
          is_parent: true,
          error: splitError(5000)
        }
      ]
    });
    expect(data).toEqual([
      expect.objectContaining({
        id: 't1',
        amount: 5000,
        error: splitError(5000)
      }),
      expect.objectContaining({ parent_id: 't1', amount: 0 }),
      expect.objectContaining({ amount: 3000 })
    ]);
  });

  test('adding a split transaction works', () => {
    let transactions = [
      makeTransaction({ amount: 2001 }),
      ...makeSplitTransaction({ id: 't1', amount: 2500 }, [
        { id: 't2', amount: 2000 },
        { id: 't3', amount: 500 }
      ]),
      makeTransaction({ amount: 3002 })
    ];

    expect(transactions.filter(t => t.parent_id === 't1').length).toBe(2);

    // Should be able to pass in any id from the split trans
    let { data, diff } = addSplitTransaction(transactions, 't1');
    expect(data.find(d => d.subtransactions)).toBeFalsy();

    expect(data.filter(t => t.parent_id === 't1').length).toBe(3);
    expect(diff).toEqual({
      added: [
        expect.objectContaining({
          id: expect.any(String),
          amount: 0,
          parent_id: 't1'
        })
      ],
      deleted: [],
      updated: []
    });
    expect(data.length).toBe(6);
  });

  test('updating a split transaction works', () => {
    let transactions = [
      makeTransaction({ amount: 2001 }),
      ...makeSplitTransaction({ id: 't1', amount: 2500 }, [
        { id: 't2', amount: 2000 },
        { id: 't3', amount: 500 }
      ]),
      makeTransaction({ amount: 3002 })
    ];
    let { data, diff } = updateTransaction(transactions, {
      id: 't2',
      amount: 2200
    });
    expect(data.find(d => d.subtransactions)).toBeFalsy();
    expect(diff).toEqual({
      added: [],
      deleted: [],
      updated: [
        { id: 't1', error: splitError(-200) },
        { id: 't2', amount: 2200 }
      ]
    });
    expect(data.length).toBe(5);
  });

  test('deleting a split transaction works', () => {
    let transactions = [
      makeTransaction({ amount: 2001 }),
      ...makeSplitTransaction({ id: 't1', amount: 2500 }, [
        { id: 't2', amount: 2000 },
        { id: 't3', amount: 500 }
      ]),
      makeTransaction({ amount: 3002 })
    ];
    let { data, diff } = deleteTransaction(transactions, 't2');

    expect(diff).toEqual({
      added: [],
      deleted: [expect.objectContaining({ id: 't2' })],
      updated: [{ id: 't1', error: splitError(2000) }]
    });
    expect(data).toEqual([
      expect.objectContaining({ amount: 2001 }),
      expect.objectContaining({
        amount: 2500,
        is_parent: true,
        error: splitError(2000)
      }),
      expect.objectContaining({ amount: 500, parent_id: 't1' }),
      expect.objectContaining({ amount: 3002 })
    ]);
  });
});
