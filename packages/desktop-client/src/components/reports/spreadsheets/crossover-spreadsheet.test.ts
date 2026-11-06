import {
  clearServer,
  initServer,
} from '@actual-app/core/platform/client/connection';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createCrossoverSpreadsheet } from './crossover-spreadsheet';
import type { CrossoverData, CrossoverParams } from './crossover-spreadsheet';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

type Transaction = {
  account: string;
  category: string | null;
  amount: number;
  date: string;
};

function matches(transaction: Transaction, expression: unknown): boolean {
  if (typeof expression !== 'object' || expression === null) {
    return true;
  }
  return Object.entries(expression).every(([key, value]) => {
    if (key === '$and') {
      return (value as unknown[]).every(e => matches(transaction, e));
    }
    if (key === '$or') {
      return (value as unknown[]).some(e => matches(transaction, e));
    }
    if (key === 'date') {
      const { $gte, $lte } = value as { $gte?: string; $lte?: string };
      return (
        (!$gte || transaction.date >= $gte) &&
        (!$lte || transaction.date <= $lte)
      );
    }
    return transaction[key as keyof Transaction] === value;
  });
}

async function runReport(
  transactions: Transaction[],
  params: Partial<CrossoverParams> = {},
) {
  initServer({
    query: async query => {
      const rows = transactions.filter(t =>
        query.filterExpressions.every(e => matches(t, e)),
      );
      if (query.calculation) {
        return {
          data: rows.reduce((sum, t) => sum + t.amount, 0),
          dependencies: [],
        };
      }
      const byMonth = new Map<string, number>();
      for (const t of rows) {
        const month = t.date.slice(0, 7);
        byMonth.set(month, (byMonth.get(month) ?? 0) + t.amount);
      }
      return {
        data: [...byMonth].map(([date, amount]) => ({ date, amount })),
        dependencies: [],
      };
    },
  });

  let report: CrossoverData | undefined;
  const spreadsheet = createCrossoverSpreadsheet({
    start: '2026-06',
    end: '2026-08',
    expenseCategoryIds: ['food'],
    incomeAccountIds: ['brokerage', '401k'],
    safeWithdrawalRate: 0.04,
    estimatedReturn: 0,
    expectedContribution: 0,
    projectionType: 'mean',
    ...params,
  });
  // The crossover factory does not use its spreadsheet dependency.
  await spreadsheet(undefined as never, data => {
    report = data;
  });
  if (!report) {
    throw new Error('Spreadsheet did not produce report data');
  }
  return report;
}

const baseTransactions: Transaction[] = [
  { account: 'brokerage', category: null, amount: 100_000, date: '2026-05-10' },
  { account: 'checking', category: 'food', amount: -1_000, date: '2026-06-05' },
  { account: 'checking', category: 'food', amount: -1_000, date: '2026-07-05' },
  { account: 'checking', category: 'food', amount: -1_000, date: '2026-08-05' },
  // Partial current month spending is not a full month of expenses
  { account: 'checking', category: 'food', amount: -10, date: '2026-09-02' },
];

describe('crossover spreadsheet', () => {
  let previousCurrentMonth: typeof global.currentMonth;

  beforeEach(() => {
    previousCurrentMonth = global.currentMonth;
    global.currentMonth = '2026-09';
  });

  afterEach(async () => {
    global.currentMonth = previousCurrentMonth;
    await clearServer();
  });

  it('includes current month balance changes in the projection', async () => {
    const report = await runReport([
      ...baseTransactions,
      // New off-budget account opened this month
      { account: '401k', category: null, amount: 50_000, date: '2026-09-01' },
    ]);

    const historical = report.graphData.data.filter(p => !p.isProjection);
    const projected = report.graphData.data.filter(p => p.isProjection);

    // Historical months only cover the selected (complete) months
    expect(historical.map(p => p.nestEgg)).toEqual([100_000, 100_000, 100_000]);
    expect(historical.map(p => p.expenses)).toEqual([1_000, 1_000, 1_000]);

    // The projection starts from today's balance, including the new account
    expect(projected[0].x).toBe('Sep 2026');
    expect(projected[0].nestEgg).toBe(150_000);
    // Partial month spending is still excluded from projected expenses
    expect(projected[0].expenses).toBe(1_000);
  });

  it('does not model contribution or growth for the current month', async () => {
    const report = await runReport(
      [
        ...baseTransactions,
        // Contribution already recorded this month
        {
          account: 'brokerage',
          category: null,
          amount: 500,
          date: '2026-09-01',
        },
      ],
      { expectedContribution: 500, estimatedReturn: 0.12 },
    );

    const projected = report.graphData.data.filter(p => p.isProjection);

    // The current month shows the actual balance, counting the contribution once
    expect(projected[0].x).toBe('Sep 2026');
    expect(projected[0].nestEgg).toBe(100_500);
    // Modeled contribution and growth start the following month
    expect(projected[1].x).toBe('Oct 2026');
    expect(projected[1].nestEgg).toBe(
      Math.round(101_000 * Math.pow(1.12, 1 / 12)),
    );
  });

  it('ignores balance changes after the range when it ends in the past', async () => {
    global.currentMonth = '2026-12';

    const report = await runReport([
      ...baseTransactions,
      { account: '401k', category: null, amount: 50_000, date: '2026-09-01' },
    ]);

    const projected = report.graphData.data.filter(p => p.isProjection);
    expect(projected[0].nestEgg).toBe(100_000);
  });
});
