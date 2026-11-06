import * as monthUtils from '@actual-app/core/shared/months';
import type {
  GroupedEntity,
  IntervalEntity,
} from '@actual-app/core/types/models';

import {
  fromBudget,
  getAverageDays,
  getAverageMonths,
  getRangeBucketInterval,
  getTrimRange,
  offsetInterval,
  offsetItem,
  offsetRows,
  rowsFromBudget,
  sumNetsFromRows,
  sumWindow,
} from './comparison-spreadsheet';
import type { ComparisonScale } from './comparison-spreadsheet';

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

// A comparison of 184 days, so a total of -18400 spends 100 a day
const scale: ComparisonScale = {
  comparisonLength: 184,
  budgeted: false,
  comparisonIntervals: 6,
  perInterval: false,
  projectToFullPeriod: true,
  averageDays: 30.5,
  averageLength: 30.5,
};
const comparisonTotals = row('comparison', [
  interval('2016-07-01', '', -18400),
]);

describe('offsetInterval', () => {
  it('leaves intervals without dates unchanged', () => {
    const undated = { ...november(-4000), intervalStartDate: undefined };

    expect(offsetInterval(undated, comparisonTotals, scale)).toBe(undated);
  });

  it('leaves intervals that have not started empty', () => {
    const offset = offsetInterval(
      interval('2017-02-01', '2017-02-28', 0),
      comparisonTotals,
      scale,
    );

    expect(offset.totalDebts).toBe(0);
    expect(offset.comparison?.expected.totalDebts).toBe(0);
    // Its comparison is still kept for charts to draw ahead: 28 days at 100
    expect(offset.comparison?.upcoming?.totalDebts).toBe(-2800);
  });

  it('only keeps the comparison ahead when projecting', () => {
    const offset = offsetInterval(
      interval('2017-02-01', '2017-02-28', 0),
      comparisonTotals,
      { ...scale, projectToFullPeriod: false },
    );

    expect(offset.comparison?.upcoming).toBeUndefined();
  });

  it('still compares budgets for intervals that have not started', () => {
    const offset = offsetInterval(
      interval('2017-02-01', '2017-02-28', -12000),
      row('comparison', [interval('2016-05-01', '', -60000)]),
      { ...scale, perInterval: true },
    );

    expect(offset.totalBudgeted).toBe(-2000);
  });

  it('offsets by the comparison daily average over the interval length', () => {
    const offset = offsetInterval(november(-4000), comparisonTotals, scale);

    // 30 days at 100 a day is 3000 expected, so 1000 more was spent
    expect(offset.comparison?.expected.totalDebts).toBe(-3000);
    expect(offset.totalDebts).toBe(-1000);
    expect(offset.comparison?.projected).toBeUndefined();
  });

  it('compares an unfinished interval against the days so far', () => {
    // Even when projecting, which only covers the whole range
    const offset = offsetInterval(january(-100), comparisonTotals, scale);

    // One day has passed, so 100 is expected rather than the whole month
    expect(offset.comparison?.projected).toBeUndefined();
    expect(offset.comparison?.expected.totalDebts).toBe(-100);
    expect(offset.totalDebts).toBe(0);
  });

  it('spreads budgets per interval rather than per day', () => {
    const offset = offsetInterval(
      interval('2016-11-01', '2016-11-30', -12000),
      row('comparison', [interval('2016-05-01', '', -60000)]),
      { ...scale, perInterval: true },
    );

    expect(offset.comparison?.expected.totalBudgeted).toBe(-10000);
    expect(offset.totalBudgeted).toBe(-2000);
  });
});

describe('offsetItem', () => {
  const months = [november(-4000), december(-3100), january(-100)];

  it('sums offset intervals so the columns add up without a projection', () => {
    const item = offsetItem(row('groceries', months), comparisonTotals, {
      ...scale,
      projectToFullPeriod: false,
    });

    expect(item.intervalData.map(i => i.totalDebts)).toEqual([-1000, 0, 0]);
    expect(item.totalDebts).toBe(-1000);
    expect(item.comparison.expected.totalDebts).toBe(-6200);
    expect(item.comparison.projected).toBeUndefined();
  });

  it('scales the pace so far to an average-length interval', () => {
    const item = offsetItem(row('groceries', months), comparisonTotals, scale);

    // 7200 over the 62 days so far, over a 30.5-day interval
    expect(item.comparison.pacePerInterval?.totalDebts).toBe(-3542);
    expect(item.comparison.perInterval?.totalDebts).toBe(-3050);
  });

  it('averages budgets per interval rather than by pace', () => {
    const item = offsetItem(
      row('groceries', months),
      row('comparison', [interval('2016-05-01', '', -60000)]),
      { ...scale, perInterval: true },
    );

    expect(item.comparison.pacePerInterval?.totalBudgeted).toBe(-2400);
  });

  it('projects the total over the whole range at its pace so far', () => {
    const item = offsetItem(row('groceries', months), comparisonTotals, scale);

    // 7200 over the 62 days so far projects to 10684 over all 92 days
    expect(item.comparison.actual.totalDebts).toBe(-7200);
    expect(item.comparison.projected?.totalDebts).toBe(-10684);
    expect(item.comparison.expected.totalDebts).toBe(-9200);
    expect(item.totalDebts).toBe(-1484);
  });

  it('projects totals even when no single interval is unfinished', () => {
    const days = [
      interval('2016-12-31', '2016-12-31', -100),
      interval('2017-01-01', '2017-01-01', -100),
      interval('2017-01-02', '2017-01-02', 0),
      interval('2017-01-03', '2017-01-03', 0),
    ];
    const item = offsetItem(row('groceries', days), comparisonTotals, scale);

    expect(item.comparison.projected?.totalDebts).toBe(-400);
    expect(item.totalDebts).toBe(0);
  });

  it('gives the comparison over an average-length interval', () => {
    const item = offsetItem(row('groceries', [november(0)]), comparisonTotals, {
      ...scale,
      averageLength: 30,
    });

    expect(item.comparison.perInterval?.totalDebts).toBe(-3000);
  });
});

describe('sumNetsFromRows', () => {
  // Income outweighs spending, so the whole total has no net payment
  function earning(
    start: string,
    end: string,
    debts: number,
    assets = 5000,
  ): IntervalEntity {
    const totalTotals = assets + debts;
    return {
      ...interval(start, end, debts),
      totalAssets: assets,
      totalTotals,
      netAssets: Math.max(totalTotals, 0),
      netDebts: Math.min(totalTotals, 0),
      totalBudgeted: totalTotals,
    };
  }
  function earningRow(id: string, intervals: IntervalEntity[]): GroupedEntity {
    const totalTotals = intervals.reduce((sum, i) => sum + i.totalTotals, 0);
    return {
      ...row(id, intervals),
      totalAssets: intervals.reduce((sum, i) => sum + i.totalAssets, 0),
      totalTotals,
      netAssets: Math.max(totalTotals, 0),
      netDebts: Math.min(totalTotals, 0),
      totalBudgeted: totalTotals,
    };
  }
  const noProjection = { ...scale, projectToFullPeriod: false };
  const comparison = earningRow('comparison', [
    earning('2016-07-01', '', -18400, 30000),
  ]);
  const totals = offsetItem(
    earningRow('totals', [
      earning('2016-11-01', '2016-11-30', -4000),
      earning('2016-12-01', '2016-12-31', -3100),
    ]),
    comparison,
    noProjection,
  );
  const rows = [
    offsetItem(
      row('rent', [november(-4000), december(-3100)]),
      comparisonTotals,
      noProjection,
    ),
    offsetItem(
      row('salary', [november(0), december(0)]),
      { ...comparisonTotals, totalDebts: 0, totalTotals: 0, netDebts: 0 },
      noProjection,
    ),
  ];

  it('gives each interval the net payment of its rows, not of its total', () => {
    expect(totals.intervalData[0].comparison?.expected.netDebts).toBe(0);

    const summed = sumNetsFromRows(totals, rows, 'Category');

    expect(
      summed.intervalData.map(i => i.comparison?.expected.netDebts),
    ).toEqual([-3000, -3100]);
    expect(summed.intervalData.map(i => i.comparison?.actual.netDebts)).toEqual(
      [-4000, -3100],
    );
    expect(summed.comparison.expected.netDebts).toBe(-6100);
    expect(summed.netDebts).toBe(rows[0].netDebts);
  });

  it('leaves the totals of an Interval split to offsetItem', () => {
    expect(sumNetsFromRows(totals, rows, 'Interval')).toBe(totals);
  });

  it('sums net fields from the intervals when they are the rows', () => {
    // November earns 1000 and December pays 1100, so the whole total pays 100
    const intervals = [
      earning('2016-11-01', '2016-11-30', -4000),
      earning('2016-12-01', '2016-12-31', -6100),
    ];
    const byInterval = offsetItem(
      earningRow('totals', intervals),
      comparison,
      noProjection,
      true,
    );

    expect(byInterval.comparison.actual.netDebts).toBe(-1100);
    expect(byInterval.comparison.actual.netAssets).toBe(1000);
    // 30.5 of the 61 days, at the same pace
    expect(byInterval.comparison.pacePerInterval?.netDebts).toBe(-550);
    expect(byInterval.comparison.pacePerInterval?.netAssets).toBe(500);
    expect(byInterval.netDebts).toBe(-1100);
  });

  it('sums net fields from the windows of each interval', () => {
    // 100 a day is spent until 24 December, then 200 a day is earned
    const earningDays = Array.from({ length: 38 }, (_, index) =>
      earning(
        monthUtils.addDays('2016-12-25', index),
        monthUtils.addDays('2016-12-25', index),
        0,
        200,
      ),
    );
    const comparisonDays = row('comparison', [
      ...days('2016-11-01', 54),
      ...earningDays,
    ]);
    const byInterval = offsetItem(
      row('totals', [
        interval('2016-12-01', '2016-12-31', -4000),
        interval('2017-01-01', '2017-01-31', -100),
      ]),
      comparisonDays,
      { ...offsetScale, projectToFullPeriod: true },
      true,
    );

    // December's window pays 3100 and January's earns 6200
    expect(byInterval.comparison.expected.netDebts).toBe(-3100);
    expect(byInterval.comparison.expected.netAssets).toBe(6200);
    expect(byInterval.comparison.perInterval?.netDebts).toBe(-1550);
    expect(byInterval.comparison.perInterval?.netAssets).toBe(3100);
  });
});

describe('offsetRows', () => {
  const context = {
    scale,
    template: [november(0)],
    showEmpty: false,
    balanceTypeOp: 'totalDebts' as const,
    sortByOp: 'desc' as const,
    sortAmount: 'change' as const,
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

  it('keeps rows that only exist in the comparison', () => {
    const [dropped] = offsetRows(
      [],
      [row('dropped', [interval('2016-07-01', '', -18400)])],
      context,
    );

    expect(dropped.totalDebts).toBe(3000);
  });

  it('hides rows with no activity in either range unless asked', () => {
    const actual = [row('unused', [november(0)])];
    const comparison = [row('unused', [interval('2016-07-01', '', 0)])];

    expect(offsetRows(actual, comparison, context)).toEqual([]);
    expect(
      offsetRows(actual, comparison, { ...context, showEmpty: true }),
    ).toHaveLength(1);
  });

  it('sorts by amount, largest spending first, when showing amounts', () => {
    const rows = offsetRows(
      [row('less', [november(-1000)]), row('more', [november(-4000)])],
      [
        row('less', [interval('2016-07-01', '', -18400)]),
        row('more', [interval('2016-07-01', '', -1840)]),
      ],
      { ...context, sortAmount: 'current' },
    );

    expect(rows.map(r => r.id)).toEqual(['more', 'less']);
  });

  it('sorts by the comparison, largest spending first', () => {
    const rows = offsetRows(
      [row('less', [november(-1000)]), row('more', [november(-4000)])],
      [
        row('less', [interval('2016-07-01', '', -18400)]),
        row('more', [interval('2016-07-01', '', -1840)]),
      ],
      { ...context, sortAmount: 'comparison' },
    );

    expect(rows.map(r => r.id)).toEqual(['less', 'more']);
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
    expect(getAverageDays([november(0), december(0)], 'Monthly')).toBe(30.5);
  });

  it('counts intervals the range cuts short at their full length', () => {
    const weeks = [
      interval('2016-12-01', '2016-12-03', 0),
      interval('2016-12-04', '2016-12-10', 0),
    ];

    expect(getAverageDays(weeks, 'Weekly')).toBe(7);
    expect(
      getAverageDays([interval('2016-11-15', '2016-11-30', 0)], 'Monthly'),
    ).toBe(30);
  });
});

describe('getRangeBucketInterval', () => {
  it('fetches whole years by year', () => {
    expect(getRangeBucketInterval('2025-01-01', '2026-12-31')).toBe('Yearly');
  });

  it('fetches whole months by month', () => {
    expect(getRangeBucketInterval('2026-05-01', '2026-10-31')).toBe('Monthly');
    expect(getRangeBucketInterval('2026-01-01', '2026-10-31')).toBe('Monthly');
  });

  it('fetches by day when a range cuts a month short', () => {
    expect(getRangeBucketInterval('2026-10-03', '2026-11-02')).toBe('Weekly');
    expect(getRangeBucketInterval('2026-05-01', '2026-11-02')).toBe('Weekly');
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
    const item = offsetItem(row('groceries', months), comparisonTotals, scale);

    // Quiet months still differ from the comparison, but count as empty
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
      comparisonTotals,
      scale,
    );

    expect(getTrimRange([item], item.intervalData, 'totalDebts').endIndex).toBe(
      2,
    );
  });

  it('keeps totals covering the whole range', () => {
    const item = offsetItem(row('groceries', months), comparisonTotals, {
      ...scale,
      projectToFullPeriod: false,
    });

    // Totals include the comparison for the quiet months either side, and for
    // the day of January so far
    expect(item.comparison.expected.totalDebts).toBe(-9300);
  });
});

// Six months of budgets adding up to 60000, so 10000 a month
const budgetScale: ComparisonScale = {
  ...scale,
  comparisonLength: 6,
  budgeted: true,
  projectToFullPeriod: false,
  averageLength: 1,
};
const budgetTotals = fromBudget({
  ...row('budget', []),
  totalAssets: 60000,
  totalDebts: 0,
  totalTotals: 60000,
  netAssets: 60000,
  netDebts: 0,
  totalBudgeted: 60000,
});

describe('fromBudget', () => {
  it('compares budgets against spending, and income against nothing', () => {
    expect(budgetTotals).toMatchObject({
      totalAssets: 0,
      totalDebts: -60000,
      totalTotals: -60000,
      netAssets: 0,
      netDebts: -60000,
      totalBudgeted: 60000,
    });
  });

  it('converts categories within groups', () => {
    const [group] = rowsFromBudget([
      {
        ...row('group', []),
        totalBudgeted: 300,
        categories: [{ ...row('category', []), totalBudgeted: 300 }],
      },
    ]);

    expect(group.totalDebts).toBe(-300);
    expect(group.categories?.[0].totalDebts).toBe(-300);
  });

  it('converts intervals, which offset windows are summed from', () => {
    const converted = fromBudget(
      row('budget', [{ ...november(0), totalBudgeted: 3000 }]),
    );

    expect(converted.intervalData[0].totalDebts).toBe(-3000);
  });
});

describe('budgeted comparisons', () => {
  it('compares each month against the average monthly budget', () => {
    // Spread by days, November and December would differ by their lengths
    expect(
      offsetInterval(november(-12000), budgetTotals, budgetScale).comparison
        ?.expected.totalDebts,
    ).toBe(-10000);
    expect(
      offsetInterval(december(-12000), budgetTotals, budgetScale),
    ).toMatchObject({
      totalDebts: -2000,
      comparison: { expected: { totalDebts: -10000 }, budgeted: true },
    });
  });

  it('spreads a monthly budget over a week by its share of the month', () => {
    const week = interval('2016-12-04', '2016-12-10', 0);

    expect(
      offsetInterval(week, budgetTotals, budgetScale).comparison?.expected
        .totalDebts,
    ).toBe(Math.round((-10000 * 7) / 31));
  });

  it('compares a month in progress against the budget for the days so far', () => {
    expect(
      offsetInterval(january(-500), budgetTotals, budgetScale).comparison
        ?.expected.totalDebts,
    ).toBe(Math.round(-10000 / 31));
  });

  it('gives the average monthly budget per interval', () => {
    const item = offsetItem(
      row('groceries', [november(0), december(0)]),
      budgetTotals,
      budgetScale,
    );

    expect(item.comparison.perInterval?.totalDebts).toBe(-10000);
    expect(item.comparison.expected.totalDebts).toBe(-20000);
    expect(item.comparison.budgeted).toBe(true);
  });
});

describe('getAverageMonths', () => {
  it('counts each interval in months', () => {
    expect(getAverageMonths([november(0), december(0)], 'Monthly')).toBe(1);
    expect(
      getAverageMonths([interval('2016-10-01', '2016-12-31', 0)], 'Quarterly'),
    ).toBe(3);
    expect(
      getAverageMonths([interval('2016-01-01', '2016-12-31', 0)], 'Yearly'),
    ).toBe(12);
    expect(
      getAverageMonths([interval('2016-12-04', '2016-12-10', 0)], 'Weekly'),
    ).toBeCloseTo(7 / 31);
  });
});

// Daily buckets as an offset comparison is fetched, each spending 100
function days(start: string, count: number, debtsPerDay = -100) {
  return Array.from({ length: count }, (_, index) => {
    const day = monthUtils.addDays(start, index);
    return interval(day, day, debtsPerDay);
  });
}

// One week back, with transactions from 2016-01-01
const weekBack = {
  shift: { unit: 'days' as const, count: 7 },
  earliestTransaction: '2016-01-01',
  bucketInterval: 'Daily',
};
const offsetScale: ComparisonScale = {
  ...scale,
  projectToFullPeriod: false,
  offset: weekBack,
};
// A month back, with transactions from 2016-10-01
const monthBackScale: ComparisonScale = {
  ...offsetScale,
  offset: {
    ...weekBack,
    shift: { unit: 'days', count: 31 },
    earliestTransaction: '2016-10-01',
  },
};
// A calendar month back
const calendarMonthBack = {
  ...weekBack,
  shift: { unit: 'months' as const, count: 1 },
};

describe('sumWindow', () => {
  it('sums the days of a window', () => {
    const buckets = days('2016-11-01', 30);

    expect(
      sumWindow(buckets, 'Daily', '2016-11-05', '2016-11-14').totalDebts,
    ).toBe(-1000);
    expect(
      sumWindow(buckets, 'Daily', '2016-10-25', '2016-11-02').totalDebts,
    ).toBe(-200);
  });

  it('spreads a month of budgets over the days of a window', () => {
    // Report spreadsheets start their first interval at the range's start
    const buckets = [
      interval('2016-11-15', '2016-11-30', -3000),
      interval('2016-12', '2016-12-31', -3100),
    ];

    // 16 of November's 30 days and 15 of December's 31
    expect(
      sumWindow(buckets, 'Monthly', '2016-11-15', '2016-12-15').totalDebts,
    ).toBe(-1600 - 1500);
  });
});

describe('offset comparisons', () => {
  const comparisonDays = row('comparison', days('2016-10-01', 130));

  it('compares each interval with its own window', () => {
    const offset = offsetInterval(
      interval('2016-12-01', '2016-12-31', -4000),
      comparisonDays,
      offsetScale,
    );

    expect(offset.comparisonStartDate).toBe('2016-11-24');
    expect(offset.comparisonEndDate).toBe('2016-12-24');
    expect(offset.comparison?.expected.totalDebts).toBe(-3100);
    expect(offset.totalDebts).toBe(-900);
  });

  it('compares a month with the calendar month before', () => {
    const offset = offsetInterval(
      interval('2016-12-01', '2016-12-31', -4000),
      comparisonDays,
      { ...offsetScale, offset: calendarMonthBack },
    );

    expect(offset.comparisonStartDate).toBe('2016-11-01');
    expect(offset.comparisonEndDate).toBe('2016-11-30');
    expect(offset.comparison?.expected.totalDebts).toBe(-3000);
  });

  it('scales a shorter window to its interval by daily average', () => {
    const offset = offsetInterval(
      interval('2016-12-01', '2016-12-31', -4000),
      comparisonDays,
      {
        ...offsetScale,
        offset: { ...calendarMonthBack, compareDailyAverage: true },
      },
    );

    // November's 30 days at 100 a day, counted over December's 31
    expect(offset.comparison?.expected.totalDebts).toBe(-3100);
  });

  it('sums the scaled windows for the whole range by daily average', () => {
    const offset = offsetItem(
      row('totals', [
        interval('2016-11-01', '2016-11-30', -3000),
        interval('2016-12-01', '2016-12-31', -4000),
      ]),
      comparisonDays,
      {
        ...offsetScale,
        projectToFullPeriod: true,
        offset: { ...calendarMonthBack, compareDailyAverage: true },
      },
    );

    // October counts over November's 30 days, and November over December's 31
    expect(offset.comparison.perInterval?.totalDebts).toBe(-(3000 + 3100) / 2);
  });

  it('shifts the days an interval was cut short to', () => {
    const offset = offsetInterval(
      interval('2016-12-10', '2016-12-31', -4000),
      comparisonDays,
      offsetScale,
    );

    expect(offset.comparisonStartDate).toBe('2016-12-03');
    expect(offset.comparison?.expected.totalDebts).toBe(-2200);
  });

  it('compares an interval in progress with the same days of its window', () => {
    const offset = offsetInterval(
      interval('2017-01-01', '2017-01-31', -100),
      comparisonDays,
      offsetScale,
    );

    // Only 1 January has passed, so only 25 December is compared
    expect(offset.comparison?.expected.totalDebts).toBe(-100);
    expect(offset.totalDebts).toBe(0);
  });

  it('keeps the whole window ahead for intervals that have not started', () => {
    const offset = offsetInterval(
      interval('2017-01-02', '2017-01-08', 0),
      comparisonDays,
      { ...offsetScale, projectToFullPeriod: false },
    );

    expect(offset.comparison?.expected.totalDebts).toBe(0);
    expect(offset.comparison?.upcoming?.totalDebts).toBe(-700);
  });

  it('has no data for windows before the earliest transaction', () => {
    const offset = offsetInterval(
      interval('2016-10-01', '2016-10-31', -4000),
      comparisonDays,
      monthBackScale,
    );

    expect(offset.comparison?.noData).toBe(true);
    expect(offset.totalDebts).toBe(0);
    expect(offset.comparison?.actual.totalDebts).toBe(-4000);
  });

  it('only compares intervals with data in totals', () => {
    const months = [
      interval('2016-10-01', '2016-10-31', -4000),
      interval('2016-11-01', '2016-11-30', -4000),
    ];
    const offset = offsetItem(
      row('actual', months),
      comparisonDays,
      monthBackScale,
    );

    // November's window is 1-30 October, 3000 against 4000 spent
    expect(offset.comparison.actual.totalDebts).toBe(-8000);
    expect(offset.comparison.expected.totalDebts).toBe(-3000);
    expect(offset.totalDebts).toBe(-1000);
    expect(offset.comparison.noData).toBeUndefined();
  });

  it('sums intervals so the columns add up', () => {
    const months = [
      interval('2016-11-01', '2016-11-30', -4000),
      interval('2016-12-01', '2016-12-31', -3000),
    ];
    const offset = offsetItem(
      row('actual', months),
      comparisonDays,
      offsetScale,
    );

    expect(offset.comparison.expected.totalDebts).toBe(-6100);
    expect(offset.totalDebts).toBe(-900);
    // The whole window over two intervals
    expect(offset.comparison.perInterval?.totalDebts).toBe(-3050);
  });

  it('projects against the whole range back', () => {
    const months = [
      interval('2016-12-01', '2016-12-31', -3100),
      interval('2017-01-01', '2017-01-31', -100),
    ];
    const offset = offsetItem(row('actual', months), comparisonDays, {
      ...offsetScale,
      projectToFullPeriod: true,
    });

    // 3200 over 32 days, projected over 62
    expect(offset.comparison.projected?.totalDebts).toBe(-6200);
    expect(offset.comparison.expected.totalDebts).toBe(-6200);
    expect(offset.totalDebts).toBe(0);
  });
});
