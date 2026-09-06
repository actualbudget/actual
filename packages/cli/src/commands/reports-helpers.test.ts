import type { ReportTransaction } from './reports';
import {
  filterForReport,
  flattenBudgetMonth,
  summarizeSpending,
} from './reports';

vi.mock('@actual-app/api', () => ({}));
vi.mock('#connection', () => ({ withConnection: vi.fn() }));

function tx(overrides: Partial<ReportTransaction>): ReportTransaction {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    date: '2024-01-05',
    amount: -1000,
    transfer_id: null,
    'account.name': 'Checking',
    'account.offbudget': false,
    'payee.name': 'Store',
    category: 'cat-food',
    'category.name': 'Food',
    'category.is_income': false,
    'category.group.name': 'Living',
    ...overrides,
  };
}

describe('filterForReport', () => {
  const rows = [
    tx({ id: 'normal' }),
    tx({ id: 'offbudget', 'account.offbudget': true }),
    tx({ id: 'transfer', transfer_id: 'other' }),
    tx({ id: 'income', 'category.is_income': true, amount: 5000 }),
  ];

  it('excludes off-budget, transfers and income by default', () => {
    expect(
      filterForReport(rows, {
        includeIncome: false,
        includeTransfers: false,
        includeOffbudget: false,
      }).map(r => r.id),
    ).toEqual(['normal']);
  });

  it('includes each class when asked', () => {
    expect(
      filterForReport(rows, {
        includeIncome: true,
        includeTransfers: true,
        includeOffbudget: true,
      }),
    ).toHaveLength(4);
  });
});

describe('summarizeSpending', () => {
  it('groups by category with totals, counts and percentages', () => {
    const rows = summarizeSpending(
      [
        tx({ amount: -3000 }),
        tx({ amount: -1000 }),
        tx({
          amount: -1000,
          category: null,
          'category.name': null,
          'category.group.name': null,
        }),
      ],
      'category',
    );
    expect(rows).toEqual([
      {
        name: 'Food',
        group: 'Living',
        transactions: 2,
        spent: -4000,
        percent: 80,
      },
      {
        name: '(uncategorized)',
        group: '',
        transactions: 1,
        spent: -1000,
        percent: 20,
      },
    ]);
  });

  it('groups by payee and account without a group column', () => {
    const byPayee = summarizeSpending(
      [tx({ 'payee.name': 'A' }), tx({ 'payee.name': null })],
      'payee',
    );
    expect(byPayee.map(r => r.name).sort()).toEqual(['(no payee)', 'A']);
    expect(byPayee[0]).not.toHaveProperty('group');

    const byAccount = summarizeSpending([tx({})], 'account');
    expect(byAccount[0].name).toBe('Checking');
  });

  it('reports zero percent when the total is zero', () => {
    expect(summarizeSpending([tx({ amount: 0 })], 'group')[0].percent).toBe(0);
  });
});

describe('flattenBudgetMonth', () => {
  const groups = [
    {
      id: 'g1',
      name: 'Living',
      categories: [
        {
          id: 'c1',
          name: 'Food',
          budgeted: 50000,
          spent: -25000,
          balance: 25000,
        },
        { id: 'c2', name: 'Hidden', hidden: true, budgeted: 100 },
        { id: 'c3', name: 'Unbudgeted', spent: -100, balance: -100 },
      ],
    },
    {
      id: 'g2',
      name: 'Income',
      is_income: true,
      categories: [{ id: 'c4', name: 'Salary', received: 300000 }],
    },
    {
      id: 'g3',
      name: 'Old',
      hidden: true,
      categories: [{ id: 'c5', name: 'X' }],
    },
  ];

  it('flattens visible categories with usage percent', () => {
    const rows = flattenBudgetMonth(groups, false);
    expect(rows.map(r => r.category)).toEqual(['Food', 'Unbudgeted', 'Salary']);
    expect(rows[0]).toEqual({
      group: 'Living',
      category: 'Food',
      budgeted: 50000,
      spent: -25000,
      balance: 25000,
      usedPercent: 50,
    });
    expect(rows[1].usedPercent).toBeNull();
    expect(rows[2].spent).toBe(300000);
  });

  it('includes hidden groups and categories when asked', () => {
    expect(flattenBudgetMonth(groups, true)).toHaveLength(5);
  });
});
