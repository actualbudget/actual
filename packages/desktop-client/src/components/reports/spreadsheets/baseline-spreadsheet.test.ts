import type {
  GroupedEntity,
  IntervalEntity,
} from '@actual-app/core/types/models';

import {
  getAverageDays,
  getTrimRange,
  offsetInterval,
  offsetItem,
  offsetRows,
} from './baseline-spreadsheet';
import type { BaselineScale } from './baseline-spreadsheet';

// In test mode, monthUtils.currentDay() returns '2017-01-01'
function interval(
  intervalStartDate: string,
  intervalEndDate: string,
  totalDebts: number,
): IntervalEntity {
  return {
    date: intervalStartDate,
    intervalStartDate,
    intervalEndDate,
    totalAssets: 0,
    totalDebts,
    totalTotals: totalDebts,
    netAssets: 0,
    netDebts: totalDebts,
    totalBudgeted: totalDebts,
  };
}

function row(id: string, intervals: IntervalEntity[]): GroupedEntity {
  const totalDebts = intervals.reduce((sum, i) => sum + i.totalDebts, 0);
  return {
    id,
    name: id,
    intervalData: intervals,
    totalAssets: 0,
    totalDebts,
    totalTotals: totalDebts,
    netAssets: 0,
    netDebts: totalDebts,
    totalBudgeted: totalDebts,
  };
}

const november = (debts: number) => interval('2016-11-01', '2016-11-30', debts);
const december = (debts: number) => interval('2016-12-01', '2016-12-31', debts);
const january = (debts: number) => interval('2017-01-01', '2017-01-31', debts);

// A baseline of 184 days, so a total of -18400 spends 100 a day
const scale: BaselineScale = {
  baselineDays: 184,
  baselineIntervals: 6,
  perInterval: false,
  projectToFullPeriod: true,
  averageDays: 30.5,
};
const baselineTotals = row('baseline', [interval('2016-07-01', '', -18400)]);

describe('offsetInterval', () => {
  it('leaves intervals without dates unchanged', () => {
    const undated = { ...november(-4000), intervalStartDate: undefined };

    expect(offsetInterval(undated, baselineTotals, scale)).toBe(undated);
  });

  it('leaves intervals that have not started empty', () => {
    const offset = offsetInterval(
      interval('2017-02-01', '2017-02-28', 0),
      baselineTotals,
      scale,
    );

    expect(offset.totalDebts).toBe(0);
    expect(offset.baseline?.expected.totalDebts).toBe(0);
  });

  it('still compares budgets for intervals that have not started', () => {
    const offset = offsetInterval(
      interval('2017-02-01', '2017-02-28', -12000),
      row('baseline', [interval('2016-05-01', '', -60000)]),
      { ...scale, perInterval: true },
    );

    expect(offset.totalBudgeted).toBe(-2000);
  });

  it('offsets by the baseline daily average over the interval length', () => {
    const offset = offsetInterval(november(-4000), baselineTotals, scale);

    // 30 days at 100 a day is 3000 expected, so 1000 more was spent
    expect(offset.baseline?.expected.totalDebts).toBe(-3000);
    expect(offset.totalDebts).toBe(-1000);
    expect(offset.baseline?.projected).toBeUndefined();
  });

  it('projects an unfinished interval to its full length', () => {
    const offset = offsetInterval(january(-100), baselineTotals, scale);

    // One day of 31 has passed
    expect(offset.baseline?.actual.totalDebts).toBe(-100);
    expect(offset.baseline?.projected?.totalDebts).toBe(-3100);
    expect(offset.totalDebts).toBe(0);
  });

  it('compares unprojected amounts against the full length', () => {
    const offset = offsetInterval(january(-100), baselineTotals, {
      ...scale,
      projectToFullPeriod: false,
    });

    expect(offset.baseline?.projected).toBeUndefined();
    expect(offset.totalDebts).toBe(3000);
  });

  it('spreads budgets per interval rather than per day', () => {
    const offset = offsetInterval(
      interval('2016-11-01', '2016-11-30', -12000),
      row('baseline', [interval('2016-05-01', '', -60000)]),
      { ...scale, perInterval: true },
    );

    expect(offset.baseline?.expected.totalBudgeted).toBe(-10000);
    expect(offset.totalBudgeted).toBe(-2000);
  });
});

describe('offsetItem', () => {
  const months = [november(-4000), december(-3100), january(-100)];

  it('sums offset intervals so the columns add up without a projection', () => {
    const item = offsetItem(row('groceries', months), baselineTotals, {
      ...scale,
      projectToFullPeriod: false,
    });

    expect(item.intervalData.map(i => i.totalDebts)).toEqual([-1000, 0, 3000]);
    expect(item.totalDebts).toBe(2000);
    expect(item.baseline.expected.totalDebts).toBe(-9200);
    expect(item.baseline.projected).toBeUndefined();
  });

  it('projects the total over the whole range at its pace so far', () => {
    const item = offsetItem(row('groceries', months), baselineTotals, scale);

    // 7200 over the 62 days so far projects to 10684 over all 92 days
    expect(item.baseline.actual.totalDebts).toBe(-7200);
    expect(item.baseline.projected?.totalDebts).toBe(-10684);
    expect(item.baseline.expected.totalDebts).toBe(-9200);
    expect(item.totalDebts).toBe(-1484);
  });

  it('projects totals even when no single interval is unfinished', () => {
    const days = [
      interval('2016-12-31', '2016-12-31', -100),
      interval('2017-01-01', '2017-01-01', -100),
      interval('2017-01-02', '2017-01-02', 0),
      interval('2017-01-03', '2017-01-03', 0),
    ];
    const item = offsetItem(row('groceries', days), baselineTotals, scale);

    expect(item.baseline.projected?.totalDebts).toBe(-400);
    expect(item.totalDebts).toBe(0);
  });

  it('gives the baseline over an average-length interval', () => {
    const item = offsetItem(row('groceries', [november(0)]), baselineTotals, {
      ...scale,
      averageDays: 30,
    });

    expect(item.baseline.perInterval?.totalDebts).toBe(-3000);
  });
});

describe('offsetRows', () => {
  const context = {
    scale,
    template: [november(0)],
    showEmpty: false,
    balanceTypeOp: 'totalDebts' as const,
    sortByOp: 'desc' as const,
  };

  it('keeps rows with activity in only one of the ranges', () => {
    const rows = offsetRows(
      [row('new', [november(-3000)]), row('dropped', [november(0)])],
      [
        row('new', [interval('2016-07-01', '', 0)]),
        row('dropped', [interval('2016-07-01', '', -18400)]),
      ],
      context,
    );

    expect(rows.map(r => r.id).sort()).toEqual(['dropped', 'new']);
  });

  it('keeps rows that only exist in the baseline', () => {
    const [dropped] = offsetRows(
      [],
      [row('dropped', [interval('2016-07-01', '', -18400)])],
      context,
    );

    expect(dropped.totalDebts).toBe(3000);
  });

  it('hides rows with no activity in either range unless asked', () => {
    const actual = [row('unused', [november(0)])];
    const baseline = [row('unused', [interval('2016-07-01', '', 0)])];

    expect(offsetRows(actual, baseline, context)).toEqual([]);
    expect(
      offsetRows(actual, baseline, { ...context, showEmpty: true }),
    ).toHaveLength(1);
  });

  it('sorts spending changes by their signed value', () => {
    const rows = offsetRows(
      [row('more', [november(-4000)]), row('less', [november(-1000)])],
      [
        row('more', [interval('2016-07-01', '', -18400)]),
        row('less', [interval('2016-07-01', '', -18400)]),
      ],
      context,
    );

    // Descending puts the largest change first, as charts draw it
    expect(rows.map(r => [r.id, r.totalDebts])).toEqual([
      ['less', 2000],
      ['more', -1000],
    ]);
  });

  it('keeps steady rows whose change is zero', () => {
    const rows = offsetRows(
      [row('steady', [november(-3000)])],
      [row('steady', [interval('2016-07-01', '', -18400)])],
      context,
    );

    expect(rows.map(r => [r.id, r.totalDebts])).toEqual([['steady', 0]]);
  });
});

describe('getAverageDays', () => {
  it('averages the full length of each interval', () => {
    expect(getAverageDays([november(0), december(0)])).toBe(30.5);
  });
});

describe('getTrimRange', () => {
  // A quiet October, spending in November and December, and nothing yet in
  // January or the months after it
  const months = [
    interval('2016-10-01', '2016-10-31', 0),
    november(-4000),
    december(-3100),
    january(0),
    interval('2017-02-01', '2017-02-28', 0),
  ];

  it('trims by what actually happened, not by the change', () => {
    const item = offsetItem(row('groceries', months), baselineTotals, scale);

    // Quiet months still differ from the baseline, but count as empty
    expect(getTrimRange([item], item.intervalData, 'totalDebts')).toEqual({
      startIndex: 1,
      endIndex: 2,
    });
  });

  it('trims intervals that have not started, even with future transactions', () => {
    const item = offsetItem(
      row('groceries', [
        ...months.slice(0, 4),
        interval('2017-02-01', '2017-02-28', -500),
      ]),
      baselineTotals,
      scale,
    );

    expect(getTrimRange([item], item.intervalData, 'totalDebts').endIndex).toBe(
      2,
    );
  });

  it('keeps totals covering the whole range', () => {
    const item = offsetItem(row('groceries', months), baselineTotals, {
      ...scale,
      projectToFullPeriod: false,
    });

    // Totals include the baseline for the quiet months either side
    expect(item.baseline.expected.totalDebts).toBe(-12300);
  });
});
