import { initServer } from '@actual-app/core/platform/client/connection';
import type { CategoryPocketsMonth } from '@actual-app/core/server/budget/pocket-readers';
import type { CategoryEntity } from '@actual-app/core/types/models';

import {
  an1Months,
  an2Months,
  sb1Months,
  travelMonth,
} from '#mocks/fxReservations';

import { buildBudgetAnalysisCsv } from './budget-analysis-export';
import { createBudgetAnalysisSpreadsheet } from './budget-analysis-spreadsheet';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

// MC-10.3: budget analysis reads the valued balance, assigned bases, FX
// contribution and resets of categories with currency pockets.
const travel: CategoryEntity = {
  id: 'travel',
  name: 'Travel',
  group: 'group1',
  is_income: false,
  hidden: false,
};

async function analyze(
  months: Record<string, CategoryPocketsMonth>,
  endDate: string,
) {
  initServer({
    'get-categories': async () => ({
      list: [travel],
      grouped: [
        { id: 'group1', name: 'Group', is_income: false, categories: [travel] },
      ],
    }),
    'envelope-budget-month': async ({ month }) =>
      months[month] ? travelMonth(month, months[month]) : [],
  });
  let data: Parameters<
    Parameters<ReturnType<typeof createBudgetAnalysisSpreadsheet>>[1]
  >[0] = undefined!;
  await createBudgetAnalysisSpreadsheet({ startDate: '2026-01-01', endDate })(
    undefined!,
    result => {
      data = result;
    },
  );
  return data;
}

describe('budget analysis with currency pockets', () => {
  it('AN1 shows assigned bases, FX contribution and the valued balance', async () => {
    const data = await analyze(an1Months, '2026-02-28');
    expect(data.intervalData).toEqual([
      {
        date: '2026-01',
        budgeted: 10000,
        spent: 0,
        fxContribution: 2500,
        balance: 12500,
        overspendingAdjustment: 0,
        incomplete: [],
      },
      {
        date: '2026-02',
        budgeted: 0,
        spent: 0,
        fxContribution: 0,
        balance: 12500,
        overspendingAdjustment: 0,
        incomplete: [],
      },
    ]);
    expect(data.totalBudgeted).toBe(10000);
  });

  it('AN2 carries the base balance in and resets pocket overspending separately', async () => {
    const data = await analyze(an2Months, '2026-02-28');
    expect(data.intervalData).toMatchObject([
      {
        date: '2026-01',
        budgeted: 5000,
        spent: -3000,
        fxContribution: 0,
        balance: 2000,
        overspendingAdjustment: 0,
      },
      {
        date: '2026-02',
        budgeted: 0,
        spent: 0,
        fxContribution: 0,
        balance: 5000,
        overspendingAdjustment: 3000,
      },
    ]);
  });

  it('SB1 keeps an out-of-range spent base null with its reason', async () => {
    const data = await analyze(sb1Months, '2026-01-31');
    expect(data.intervalData).toEqual([
      {
        date: '2026-01',
        budgeted: 0,
        spent: null,
        fxContribution: null,
        balance: -2,
        overspendingAdjustment: 0,
        incomplete: ['amount-out-of-range'],
      },
    ]);
    expect(data.totalSpent).toBe(null);
  });
});

describe('budget analysis CSV with currency pockets', () => {
  const lines = (csv: string) => csv.trimEnd().split('\n');

  it('AN1 adds an FX contribution column and a notes column', async () => {
    const data = await analyze(an1Months, '2026-02-28');
    expect(lines(buildBudgetAnalysisCsv(data.intervalData, 2))).toEqual([
      'Month,Budgeted,Spent,Overspending Adjustment,FX contribution,Balance,Notes',
      '2026-01,100,0,0,25,125,',
      '2026-02,0,0,0,0,125,',
    ]);
  });

  it('SB1 leaves an unknown cell empty and names the reason', async () => {
    const data = await analyze(sb1Months, '2026-01-31');
    expect(lines(buildBudgetAnalysisCsv(data.intervalData, 2))[1]).toBe(
      '2026-01,0,,0,,-0.02,amount-out-of-range',
    );
  });
});

describe('inspection 1 regressions', () => {
  const january = an1Months['2026-01'];

  it('finding 5: an unknown balance passes through a month without an entry', async () => {
    const data = await analyze(
      {
        '2026-01': {
          ...january,
          balance: null,
          incomplete: ['amount-out-of-range'],
        },
      },
      '2026-02-28',
    );
    expect(data.intervalData).toMatchObject([
      { date: '2026-01', balance: null, incomplete: ['amount-out-of-range'] },
      { date: '2026-02', balance: null, incomplete: ['amount-out-of-range'] },
    ]);
  });

  it('finding 3: an unvalued carry-in is named in the CSV notes', async () => {
    const data = await analyze(
      {
        '2026-01': {
          ...january,
          carryIn: null,
          fxContribution: null,
          incomplete: ['reservation-unvalued'],
        },
      },
      '2026-01-31',
    );
    expect(
      buildBudgetAnalysisCsv(data.intervalData, 2).trimEnd().split('\n')[1],
    ).toBe('2026-01,100,0,0,,125,reservation-unvalued');
  });
});
