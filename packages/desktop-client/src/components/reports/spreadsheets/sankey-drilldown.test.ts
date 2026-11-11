import type { TFunction } from 'i18next';

import {
  buildDrilldownData,
  buildNeighborhoodData,
  dimensionCandidates,
  filterTransactionsByPath,
  limitBuckets,
  nextDimension,
  segmentForGraphNode,
} from './sankey-drilldown';
import type { DrillSegment, FlowTransaction } from './sankey-drilldown';
import { GraphLayers } from './sankey-spreadsheet';
import type { Graph } from './sankey-spreadsheet';

// Natural-language keys: the translation function just interpolates.
const t = ((key: string, params?: Record<string, unknown>) =>
  key.replace(/\{\{(\w+)\}\}/g, (_, name) =>
    String(params?.[name] ?? ''),
  )) as unknown as TFunction;

const options = { topN: 10, t, formatDate: (date: string) => date };

function transaction(
  overrides: Partial<FlowTransaction> & Pick<FlowTransaction, 'id' | 'amount'>,
): FlowTransaction {
  return {
    date: '2026-10-01',
    notes: null,
    accountId: 'acct-boa',
    accountName: 'Bank of America',
    payeeId: 'payee-store',
    payeeName: 'Store',
    categoryId: 'cat-food',
    categoryName: 'Food',
    groupId: 'group-usual',
    groupName: 'Usual Expenses',
    isIncome: false,
    ...overrides,
  };
}

const transactions: FlowTransaction[] = [
  transaction({ id: 't1', amount: -10000, date: '2026-10-03' }),
  transaction({
    id: 't2',
    amount: -5000,
    date: '2026-10-02',
    payeeId: 'payee-cafe',
    payeeName: 'Cafe',
  }),
  transaction({
    id: 't3',
    amount: -6000,
    categoryId: 'cat-power',
    categoryName: 'Power',
    groupId: 'group-bills',
    groupName: 'Bills',
    payeeId: 'payee-utility',
    payeeName: 'Utility Co',
    accountId: 'acct-ally',
    accountName: 'Ally',
  }),
  transaction({
    id: 't4',
    amount: 300000,
    categoryId: 'cat-salary',
    categoryName: 'Salary',
    groupId: 'group-income',
    groupName: 'Income',
    payeeId: 'payee-employer',
    payeeName: 'Employer',
    isIncome: true,
  }),
];

describe('segmentForGraphNode', () => {
  it('maps every spent-view layer to a flow segment', () => {
    expect(
      segmentForGraphNode({
        key: 'payee-1',
        name: 'Employer',
        layer: GraphLayers.IncomePayee,
      }),
    ).toEqual({
      type: 'flow',
      dimension: 'payee',
      ids: ['payee-1'],
      name: 'Employer',
      kind: 'income',
    });
    expect(
      segmentForGraphNode({
        key: 'cat-1',
        name: 'Salary',
        layer: GraphLayers.IncomeCategory,
      }),
    ).toMatchObject({ dimension: 'category', ids: ['cat-1'], kind: 'income' });
    expect(
      segmentForGraphNode({
        key: 'acct-1',
        name: 'Checking',
        layer: GraphLayers.Account,
      }),
    ).toMatchObject({ dimension: 'account', ids: ['acct-1'] });
    expect(
      segmentForGraphNode({
        key: 'group-1',
        name: 'Bills',
        layer: GraphLayers.CategoryGroup,
      }),
    ).toMatchObject({ dimension: 'group', ids: ['group-1'], kind: 'expense' });
    expect(
      segmentForGraphNode({
        key: 'cat-2',
        name: 'Power',
        layer: GraphLayers.Category,
      }),
    ).toMatchObject({ dimension: 'category', ids: ['cat-2'], kind: 'expense' });
  });

  it('expands "Other" buckets to their members', () => {
    expect(
      segmentForGraphNode({
        key: 'group-1__OTHER_BUCKET',
        name: 'Other',
        layer: GraphLayers.Category,
        members: ['cat-a', 'cat-b'],
      }),
    ).toMatchObject({ dimension: 'category', ids: ['cat-a', 'cat-b'] });
    expect(
      segmentForGraphNode({
        key: 'group-1__OTHER_BUCKET',
        name: 'Other',
        layer: GraphLayers.Category,
        members: [],
      }),
    ).toBeNull();
  });

  it('treats grouped accounts as all accounts', () => {
    expect(
      segmentForGraphNode({
        key: 'all_income',
        name: 'Income',
        layer: GraphLayers.Account,
      }),
    ).toMatchObject({ dimension: 'account', ids: null });
  });

  it('keeps the sign of reversed flows', () => {
    expect(
      segmentForGraphNode({
        key: 'cat-1__NEGATIVE',
        name: 'Refund',
        layer: GraphLayers.IncomeCategory,
      }),
    ).toMatchObject({
      dimension: 'category',
      ids: ['cat-1'],
      kind: 'expense',
      sign: 'positive',
    });
    expect(
      segmentForGraphNode({
        key: 'cat-1__NEGATIVE',
        name: 'Negative income',
        layer: GraphLayers.CategoryGroup,
      }),
    ).toMatchObject({
      dimension: 'category',
      kind: 'income',
      sign: 'negative',
    });
  });

  it('ignores hidden and budget-only nodes', () => {
    expect(
      segmentForGraphNode({
        key: 'x__HIDDEN',
        name: '',
        layer: GraphLayers.Category,
      }),
    ).toBeNull();
    expect(
      segmentForGraphNode({
        key: 'budgeted',
        name: 'Budgeted',
        layer: GraphLayers.Budget,
      }),
    ).toBeNull();
  });
});

describe('dimension order', () => {
  it('only walks downstream, then ends at the transactions', () => {
    expect(nextDimension('expense', ['group'])).toBe('category');
    expect(nextDimension('expense', ['group', 'category'])).toBe('payee');
    // Going back upstream (accounts) is never offered.
    expect(nextDimension('expense', ['group', 'category', 'payee'])).toBe(
      'transaction',
    );
    expect(nextDimension('expense', ['account'])).toBe('group');
    expect(nextDimension('income', ['payee'])).toBe('category');
    expect(nextDimension('income', ['category'])).toBe('account');
    expect(nextDimension('income', ['category', 'account'])).toBe(
      'transaction',
    );
  });

  it('lists the remaining downstream dimensions in flow order', () => {
    expect(dimensionCandidates('expense', ['group'])).toEqual([
      'category',
      'payee',
    ]);
    expect(dimensionCandidates('expense', ['account', 'category'])).toEqual([
      'payee',
    ]);
    expect(dimensionCandidates('income', ['category', 'account'])).toEqual([]);
  });
});

describe('filterTransactionsByPath', () => {
  it('applies every segment', () => {
    const path: DrillSegment[] = [
      {
        type: 'flow',
        dimension: 'group',
        ids: ['group-usual'],
        name: 'Usual Expenses',
        kind: 'expense',
      },
      {
        type: 'flow',
        dimension: 'payee',
        ids: ['payee-cafe'],
        name: 'Cafe',
        kind: 'expense',
      },
    ];
    expect(filterTransactionsByPath(transactions, path).map(x => x.id)).toEqual(
      ['t2'],
    );
  });

  it('supports "all" and sign restrictions', () => {
    expect(
      filterTransactionsByPath(transactions, [
        { type: 'flow', dimension: 'account', ids: null, name: 'All' },
      ]),
    ).toHaveLength(4);
    expect(
      filterTransactionsByPath(transactions, [
        {
          type: 'flow',
          dimension: 'account',
          ids: ['acct-boa'],
          name: 'BoA',
          sign: 'positive',
        },
      ]).map(x => x.id),
    ).toEqual(['t4']);
  });
});

describe('limitBuckets', () => {
  const buckets = [
    { id: 'a', name: 'A', value: 50, count: 1 },
    { id: 'b', name: 'B', value: 30, count: 2 },
    { id: 'c', name: 'C', value: 20, count: 3 },
    { id: 'd', name: 'D', value: 10, count: 4 },
  ];

  it('keeps everything when within the limit', () => {
    expect(limitBuckets(buckets, 4, 'Other')).toEqual(buckets);
  });

  it('folds the smallest buckets into "Other"', () => {
    const limited = limitBuckets(buckets, 3, 'Other');
    expect(limited.map(b => b.id)).toEqual(['a', 'b', '__OTHER_BUCKET']);
    expect(limited[2]).toMatchObject({
      name: 'Other',
      value: 30,
      count: 7,
      ids: ['c', 'd'],
    });
  });
});

describe('buildDrilldownData', () => {
  it('shows the sources, the branch and its breakdown for a category group', () => {
    const withClothing = [
      ...transactions,
      transaction({
        id: 't6',
        amount: -5000,
        categoryId: 'cat-clothing',
        categoryName: 'Clothing',
      }),
    ];
    const data = buildDrilldownData(
      withClothing,
      [
        {
          type: 'flow',
          dimension: 'group',
          ids: ['group-usual'],
          name: 'Usual Expenses',
          kind: 'expense',
        },
      ],
      options,
    );

    const names = data.nodes.map(node => node.name);
    // The branch on the left, then where its money went. Where the money
    // came from is deliberately not shown.
    expect(names).toEqual(['Usual Expenses', 'Food', 'Clothing']);
    const current = data.nodes[0];
    expect(current.drill).toBeNull();

    const food = data.nodes[1];
    expect(food.drill).toMatchObject({
      dimension: 'category',
      ids: ['cat-food'],
      kind: 'expense',
    });
    expect(food.percentageLabel).toBe('75.0%');

    expect(data.links).toEqual([
      expect.objectContaining({ source: 0, target: 1, value: 15000 }),
      expect.objectContaining({ source: 0, target: 2, value: 5000 }),
    ]);
  });

  it('keeps breaking a branch down until the transactions show', () => {
    const path: DrillSegment[] = [
      {
        type: 'flow',
        dimension: 'group',
        ids: ['group-usual'],
        name: 'Usual Expenses',
        kind: 'expense',
      },
      {
        type: 'flow',
        dimension: 'category',
        ids: ['cat-food'],
        name: 'Food',
        kind: 'expense',
      },
    ];
    const byPayee = buildDrilldownData(transactions, path, options);
    expect(byPayee.nodes.map(node => node.name)).toEqual([
      'Food',
      'Store',
      'Cafe',
    ]);
    expect(byPayee.nodes[0].drill).toBeNull();

    const storeSegment = byPayee.nodes[1].drill!;
    const leaf = buildDrilldownData(
      transactions,
      [...path, storeSegment],
      options,
    );
    // Only one account is left to split by, so that level is skipped and the
    // individual transactions show right away.
    expect(leaf.nodes.map(node => node.name)).toEqual(['Store', '2026-10-03']);
    expect(leaf.nodes[1]).toMatchObject({ transactionId: 't1', drill: null });
  });

  it('ends at the transactions even when several accounts were used', () => {
    const twoAccounts = [
      ...transactions,
      transaction({
        id: 't5',
        amount: -2000,
        accountId: 'acct-ally',
        accountName: 'Ally',
      }),
    ];
    const path: DrillSegment[] = [
      {
        type: 'flow',
        dimension: 'group',
        ids: ['group-usual'],
        name: 'Usual Expenses',
        kind: 'expense',
      },
      {
        type: 'flow',
        dimension: 'category',
        ids: ['cat-food'],
        name: 'Food',
        kind: 'expense',
      },
      {
        type: 'flow',
        dimension: 'payee',
        ids: ['payee-store'],
        name: 'Store',
        kind: 'expense',
      },
    ];
    const data = buildDrilldownData(twoAccounts, path, options);
    // The accounts are upstream of the payee, so the payee's transactions
    // show rather than a split by account.
    expect(data.nodes.map(node => node.name)).toEqual([
      'Store',
      '2026-10-03',
      '2026-10-01',
    ]);
    expect(data.nodes.slice(1).every(node => node.drill === null)).toBe(true);
  });

  it('shows where the money that left an account went', () => {
    const account: DrillSegment = {
      type: 'flow',
      dimension: 'account',
      ids: ['acct-boa'],
      name: 'Bank of America',
    };
    const data = buildDrilldownData(transactions, [account], options);

    expect(data.nodes.map(node => node.name)).toEqual([
      'Bank of America',
      'Usual Expenses',
    ]);
    expect(data.nodes[1].drill).toMatchObject({
      dimension: 'group',
      kind: 'expense',
    });
    expect(data.links).toEqual([
      expect.objectContaining({ source: 0, target: 1, value: 15000 }),
    ]);

    // An account without spending shows the income it received instead.
    const incomeOnly = buildDrilldownData(
      transactions.filter(transaction => transaction.amount > 0),
      [account],
      options,
    );
    expect(incomeOnly.nodes.map(node => node.name)).toEqual([
      'Bank of America',
      'Salary',
    ]);
    expect(incomeOnly.nodes[1].drill).toMatchObject({
      dimension: 'category',
      kind: 'income',
    });
  });

  it('folds many transactions into a "more" node', () => {
    const many = Array.from({ length: 6 }, (_, index) =>
      transaction({
        id: `m${index}`,
        amount: -(index + 1) * 100,
        date: `2026-10-1${index}`,
      }),
    );
    const data = buildDrilldownData(
      many,
      [
        {
          type: 'flow',
          dimension: 'payee',
          ids: ['payee-store'],
          name: 'Store',
          kind: 'expense',
        },
        {
          type: 'flow',
          dimension: 'account',
          ids: ['acct-boa'],
          name: 'Bank of America',
          kind: 'expense',
        },
        {
          type: 'flow',
          dimension: 'group',
          ids: ['group-usual'],
          name: 'Usual Expenses',
          kind: 'expense',
        },
        {
          type: 'flow',
          dimension: 'category',
          ids: ['cat-food'],
          name: 'Food',
          kind: 'expense',
        },
      ],
      { ...options, topN: 4 },
    );

    const right = data.nodes.slice(1);
    expect(right).toHaveLength(4);
    // Newest first...
    expect(right[0]).toMatchObject({ transactionId: 'm5' });
    // ...and the remainder summarized.
    expect(right[3]).toMatchObject({
      name: '3 more transactions',
      drill: null,
    });
    expect(right[3].transactionId).toBeUndefined();
  });
});

describe('buildDrilldownData for "Other" buckets', () => {
  it('first splits a bucket into its members', () => {
    const data = buildDrilldownData(
      transactions,
      [
        {
          type: 'flow',
          dimension: 'category',
          ids: ['cat-food', 'cat-power'],
          name: 'Other',
          kind: 'expense',
        },
      ],
      options,
    );
    expect(data.nodes.map(node => node.name)).toEqual([
      'Other',
      'Food',
      'Power',
    ]);
    expect(data.nodes[1].drill).toMatchObject({
      dimension: 'category',
      ids: ['cat-food'],
    });
  });
});

describe('buildNeighborhoodData', () => {
  it('shows what flows out of a node', () => {
    const graph: Graph = new Map([
      [
        'budgeted',
        {
          to: new Map([['group-1', 500]]),
          type: GraphLayers.Budget,
          name: 'Budgeted',
        },
      ],
      [
        'group-1',
        {
          to: new Map([
            ['cat-1', 300],
            ['cat-2', 200],
          ]),
          type: GraphLayers.CategoryGroup,
          name: 'Bills',
        },
      ],
      ['cat-1', { to: new Map(), type: GraphLayers.Category, name: 'Power' }],
      ['cat-2', { to: new Map(), type: GraphLayers.Category, name: 'Water' }],
    ]);

    const data = buildNeighborhoodData(graph, 'group-1', t);
    expect(data.nodes.map(node => node.name)).toEqual([
      'Bills',
      'Power',
      'Water',
    ]);
    expect(data.nodes[1].percentageLabel).toBe('60.0%');
    // Leaves cannot be explored further.
    expect(data.nodes[1].drill).toBeNull();
    expect(data.links).toEqual([
      expect.objectContaining({ source: 0, target: 1, value: 300 }),
      expect.objectContaining({ source: 0, target: 2, value: 200 }),
    ]);

    const fromBudget = buildNeighborhoodData(graph, 'budgeted', t);
    expect(fromBudget.nodes.map(node => node.name)).toEqual([
      'Budgeted',
      'Bills',
    ]);
    expect(fromBudget.nodes[1].drill).toMatchObject({
      type: 'node',
      key: 'group-1',
    });
  });
});
