import type { CustomReportComparisonOffsetUnit } from '@actual-app/core/types/models';

import {
  canUseBudgetedComparison,
  countDays,
  countElapsedDays,
  countElapsedMonths,
  countMonths,
  defaultComparison,
  getComparisonRange,
  getComparisonShift,
  getComparisonSortAmount,
  getFullIntervalDays,
  isBudgetedComparison,
  isOffsetOverlapping,
  rangesOverlap,
  shiftDate,
  shiftRange,
} from './comparisonRange';
import { disabledList } from './disabledList';
import { ReportOptions } from './ReportOptions';

// In test mode, monthUtils.currentDay() returns '2017-01-01'
describe('comparison day counts', () => {
  it('counts days inclusively, accepting month strings', () => {
    expect(countDays('2016-12-01', '2016-12-31')).toBe(31);
    expect(countDays('2016-12', '2016-12-31')).toBe(31);
  });

  it('only counts days that have already happened', () => {
    expect(countElapsedDays('2016-12-01', '2017-01-31')).toBe(32);
    expect(countElapsedDays('2017-02-01', '2017-02-28')).toBe(1);
  });
});

describe('comparison month counts', () => {
  it('counts part months by their share of days', () => {
    expect(countMonths('2016-11-01', '2016-12-31')).toBe(2);
    expect(countMonths('2016-11-16', '2016-12-31')).toBeCloseTo(1.5);
  });

  it('only counts days that have already happened', () => {
    expect(countElapsedMonths('2016-12-01', '2017-01-31')).toBeCloseTo(
      1 + 1 / 31,
    );
    expect(countElapsedMonths('2017-02-01', '2017-02-28')).toBeCloseTo(1 / 28);
  });

  it('gives quarters their full length in days', () => {
    expect(getFullIntervalDays('2016-11-15', 'Quarterly')).toBe(92);
  });
});

describe('budgeted comparisons', () => {
  it('only apply to splits with budgets', () => {
    expect(canUseBudgetedComparison('Category')).toBe(true);
    expect(canUseBudgetedComparison('Group')).toBe(true);
    expect(canUseBudgetedComparison('Interval')).toBe(true);
    expect(canUseBudgetedComparison('Payee')).toBe(false);
  });

  it('need a budgeted source', () => {
    const budgeted = { ...defaultComparison, source: 'budgeted' as const };
    expect(isBudgetedComparison(budgeted, 'Category')).toBe(true);
    expect(isBudgetedComparison(budgeted, 'Tag')).toBe(false);
    expect(isBudgetedComparison(defaultComparison, 'Category')).toBe(false);
  });

  it('apply to offset comparisons too', () => {
    const offset = {
      ...defaultComparison,
      source: 'budgeted' as const,
      mode: 'offset' as const,
    };
    expect(isBudgetedComparison(offset, 'Category')).toBe(true);
  });
});

describe('offset comparisons', () => {
  const months = (count: number) => ({ unit: 'months' as const, count });
  const days = (count: number) => ({ unit: 'days' as const, count });
  const shiftOf = (
    offsetUnit: CustomReportComparisonOffsetUnit,
    offsetCount: number,
    interval = 'Monthly',
    range: [string, string] = ['2016-07-01', '2016-12-31'],
  ) =>
    getComparisonShift(
      { ...defaultComparison, offsetUnit, offsetCount },
      interval,
      range,
    );

  it('converts days, weeks, months and years', () => {
    expect(shiftOf('days', 3)).toEqual(days(3));
    expect(shiftOf('weeks', 52)).toEqual(days(364));
    expect(shiftOf('months', 2)).toEqual(months(2));
    expect(shiftOf('years', 1)).toEqual(months(12));
  });

  it('keeps the weekdays of weekly reports a year back', () => {
    expect(shiftOf('years', 2, 'Weekly')).toEqual(days(728));
  });

  it('moves by the report interval', () => {
    expect(shiftOf('intervals', 2, 'Daily')).toEqual(days(2));
    expect(shiftOf('intervals', 2, 'Weekly')).toEqual(days(14));
    expect(shiftOf('intervals', 2, 'Monthly')).toEqual(months(2));
    expect(shiftOf('intervals', 2, 'Quarterly')).toEqual(months(6));
    expect(shiftOf('intervals', 2, 'Yearly')).toEqual(months(24));
  });

  it('moves by whole-month ranges in months, and others in days', () => {
    expect(shiftOf('ranges', 1)).toEqual(months(6));
    expect(shiftOf('ranges', 2, 'Monthly', ['2016-07', '2016-12-31'])).toEqual(
      months(12),
    );
    expect(
      shiftOf('ranges', 1, 'Weekly', ['2016-12-04', '2016-12-31']),
    ).toEqual(days(28));
  });

  it('shifts both ends of a range by days, accepting month strings', () => {
    expect(shiftRange('2017-03', '2017-03-31', days(364))).toEqual([
      '2016-03-02',
      '2016-04-01',
    ]);
    expect(shiftRange('2017-01-01', '2017-01-07', days(7))).toEqual([
      '2016-12-25',
      '2016-12-31',
    ]);
  });

  it('shifts months to the same days, keeping month ends', () => {
    expect(shiftRange('2017-03', '2017-03-31', months(1))).toEqual([
      '2017-02-01',
      '2017-02-28',
    ]);
    expect(shiftRange('2017-02-01', '2017-02-28', months(1))).toEqual([
      '2017-01-01',
      '2017-01-31',
    ]);
    expect(shiftRange('2016-11-15', '2016-12-14', months(1))).toEqual([
      '2016-10-15',
      '2016-11-14',
    ]);
  });

  it('cuts days past the end of a shorter month', () => {
    expect(shiftDate('2017-03-30', months(1), false)).toBe('2017-02-28');
    expect(shiftDate('2017-03-30', months(1), true)).toBe('2017-02-28');
  });

  it('handles 29 February a year either side', () => {
    expect(shiftRange('2016-02-01', '2016-02-29', months(12))).toEqual([
      '2015-02-01',
      '2015-02-28',
    ]);
    expect(shiftRange('2017-02-01', '2017-02-28', months(12))).toEqual([
      '2016-02-01',
      '2016-02-29',
    ]);
  });

  it('warns when windows can overlap their intervals', () => {
    expect(isOffsetOverlapping(days(7), 'Weekly')).toBe(false);
    expect(isOffsetOverlapping(days(6), 'Weekly')).toBe(true);
    expect(isOffsetOverlapping(days(28), 'Monthly')).toBe(true);
    expect(isOffsetOverlapping(days(35), 'Monthly')).toBe(false);
    expect(isOffsetOverlapping(days(1), 'Daily')).toBe(false);
    expect(isOffsetOverlapping(months(1), 'Weekly')).toBe(false);
    expect(isOffsetOverlapping(months(1), 'Monthly')).toBe(false);
    expect(isOffsetOverlapping(months(1), 'Quarterly')).toBe(true);
    expect(isOffsetOverlapping(months(6), 'Yearly')).toBe(true);
  });
});

describe('getComparisonSortAmount', () => {
  it('sorts by what is drawn unless another amount is chosen', () => {
    expect(getComparisonSortAmount(defaultComparison, true)).toBe('current');
    expect(getComparisonSortAmount(defaultComparison, false)).toBe('change');
    expect(
      getComparisonSortAmount(
        { ...defaultComparison, sortAmount: 'comparison' },
        false,
      ),
    ).toBe('comparison');
  });
});

describe('rangesOverlap', () => {
  it('detects shared days', () => {
    expect(
      rangesOverlap(['2016-07-01', '2016-12-31'], ['2016-12-31', '2017-01-31']),
    ).toBe(true);
    expect(
      rangesOverlap(['2016-07-01', '2016-12-31'], ['2017-01-01', '2017-01-31']),
    ).toBe(false);
  });
});

describe('getComparisonRange', () => {
  it('defaults to the six complete months before today', () => {
    expect(
      getComparisonRange(defaultComparison, '2015-01-01', '2017-01-01'),
    ).toEqual(['2016-07-01', '2016-12-31']);
  });

  it('keeps a static range as chosen', () => {
    expect(
      getComparisonRange(
        {
          ...defaultComparison,
          isDateStatic: true,
          startDate: '2016-03-01',
          endDate: '2016-03-15',
        },
        '2015-01-01',
        '2017-01-01',
      ),
    ).toEqual(['2016-03-01', '2016-03-15']);
  });
});

describe('comparison "include current" checkbox', () => {
  // "Last month" disables the toggle but its saved value still widens the
  // range. The date filter has the same bug and the fix is pending upstream;
  // once it lands this starts passing and should move to the main list.
  const KNOWN_DISABLED_BUT_APPLIED = ['Last month'];

  function expectToggleMatchesEnabledState(dateRange: string) {
    const resolve = (includeCurrentInterval: boolean) =>
      getComparisonRange(
        { ...defaultComparison, dateRange, includeCurrentInterval },
        '2015-01-01',
        '2017-01-01',
      );

    // The checkbox shares the date filter's rule for when it is disabled, so
    // a disabled checkbox must never change which dates are used
    if (disabledList.currentInterval.get(dateRange)) {
      expect(resolve(true)).toEqual(resolve(false));
    } else {
      expect(resolve(true)).not.toEqual(resolve(false));
    }
  }

  it.each(
    ReportOptions.dateRange
      .map(option => option.key)
      .filter(key => !KNOWN_DISABLED_BUT_APPLIED.includes(key)),
  )('only changes "%s" when it is enabled', expectToggleMatchesEnabledState);

  it.fails.each(KNOWN_DISABLED_BUT_APPLIED)(
    'only changes "%s" when it is enabled (known bug)',
    expectToggleMatchesEnabledState,
  );

  it('never changes a static range', () => {
    const range = { ...defaultComparison, isDateStatic: true };
    expect(
      getComparisonRange(
        { ...range, includeCurrentInterval: true },
        '2015-01-01',
        '2017-01-01',
      ),
    ).toEqual(
      getComparisonRange(
        { ...range, includeCurrentInterval: false },
        '2015-01-01',
        '2017-01-01',
      ),
    );
  });
});
