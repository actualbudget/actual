import * as monthUtils from '@actual-app/core/shared/months';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';
import { describe, expect, it } from 'vitest';

import { ReportOptions } from '#components/reports/ReportOptions';

import { countFilteredIntervals } from './countFilteredIntervals';

function countForReport(
  startDate: string,
  endDate: string,
  interval: string,
  filters: unknown[],
  conditionsOp: string,
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'],
) {
  const intervals =
    interval === 'Weekly'
      ? monthUtils.weekRangeInclusive(startDate, endDate, firstDayOfWeekIdx)
      : monthUtils[
          ReportOptions.intervalRange.get(interval) || 'rangeInclusive'
        ](startDate, endDate);
  return countFilteredIntervals(
    startDate,
    endDate,
    interval,
    intervals,
    filters,
    conditionsOp,
  );
}

describe('countFilteredIntervals', () => {
  const start = '2025-12-15';
  const end = '2026-04-15';
  const payee = { payee: { $eq: 'payee-id' } };
  const january = {
    $and: [{ date: { $gte: '2026-01-00' } }, { date: { $lte: '2026-01-99' } }],
  };

  it('applies strict comparisons at month boundaries', () => {
    expect(
      countForReport(
        start,
        end,
        'Monthly',
        [{ date: { $gt: '2025-12-31' } }, { date: { $lt: '2026-03-01' } }],
        'and',
      ),
    ).toBe(2);
  });

  it('counts only months with a date that satisfies every date condition', () => {
    expect(
      countForReport(
        start,
        end,
        'Monthly',
        [{ date: { $gte: '2026-02-20' } }, { date: { $lte: '2026-02-10' } }],
        'and',
      ),
    ).toBe(0);
  });

  it('counts each month once when date alternatives overlap or have gaps', () => {
    expect(
      countForReport(
        start,
        end,
        'Monthly',
        [january, { date: '2026-01-14' }, { date: '2026-03-01' }],
        'or',
      ),
    ).toBe(2);
  });

  it('limits a year filter to the report months', () => {
    const year = {
      $and: [
        { date: { $gte: '2026-00-00' } },
        { date: { $lte: '2026-99-99' } },
      ],
    };
    expect(countForReport(start, end, 'Monthly', [year], 'and')).toBe(4);
  });

  it('counts both months covered by an approximate date match', () => {
    const aroundFebruaryFirst = {
      $and: [
        { date: { $gte: '2026-01-30' } },
        { date: { $lte: '2026-02-03' } },
      ],
    };
    expect(
      countForReport(start, end, 'Monthly', [aroundFebruaryFirst], 'and'),
    ).toBe(2);
  });

  it('respects how date filters are combined with other fields', () => {
    expect(countForReport(start, end, 'Monthly', [january, payee], 'and')).toBe(
      1,
    );
    expect(countForReport(start, end, 'Monthly', [january, payee], 'or')).toBe(
      5,
    );
  });

  it('does not widen the date range for an empty category selection joined with OR', () => {
    expect(
      countForReport(
        start,
        end,
        'Monthly',
        [{ date: '2026-01-15' }, { id: null }],
        'or',
      ),
    ).toBe(1);
  });

  it('counts July through September as one quarter', () => {
    expect(
      countForReport(
        '2025-10-01',
        '2026-12-31',
        'Quarterly',
        [{ date: { $gte: '2026-07-01' } }, { date: { $lte: '2026-09-30' } }],
        'and',
      ),
    ).toBe(1);
  });

  it('counts both quarters when a filter crosses a quarter boundary', () => {
    expect(
      countForReport(
        '2026-01-01',
        '2026-12-31',
        'Quarterly',
        [{ date: { $gte: '2026-06-30' } }, { date: { $lte: '2026-07-01' } }],
        'and',
      ),
    ).toBe(2);
  });

  it.each(['Monthly', 'Quarterly'] as const)(
    'applies both bounds of an is between filter for %s reports',
    interval => {
      expect(
        countForReport(
          '2025-10-01',
          '2027-03-31',
          interval,
          [{ date: [{ $gte: '2026-06-30' }, { $lte: '2026-07-01' }] }],
          'and',
        ),
      ).toBe(2);
    },
  );

  it('excludes dates outside the report even within its boundary quarter', () => {
    expect(
      countForReport(
        '2026-02-01',
        '2026-08-31',
        'Quarterly',
        [{ date: '2026-01-31' }, { date: '2026-09-01' }],
        'or',
      ),
    ).toBe(0);
  });

  it('counts the year covered by a date filter within a multi-year report', () => {
    expect(
      countForReport(
        '2025-01-01',
        '2026-12-31',
        'Yearly',
        [{ date: [{ $gte: '2026-07-01' }, { $lte: '2026-09-30' }] }],
        'and',
      ),
    ).toBe(1);
  });

  it('uses the full boundary years of the transaction query', () => {
    expect(
      countForReport(
        '2025-06-15',
        '2026-03-15',
        'Yearly',
        [{ date: '2025-01-01' }, { date: '2026-12-31' }],
        'or',
      ),
    ).toBe(2);
  });

  it('uses the same week boundaries as the report', () => {
    const filters = [
      { date: [{ $gte: '2026-06-28' }, { $lte: '2026-07-06' }] },
    ];
    expect(
      countForReport('2026-06-01', '2026-07-31', 'Weekly', filters, 'and', '0'),
    ).toBe(2);
    expect(
      countForReport('2026-06-01', '2026-07-31', 'Weekly', filters, 'and', '1'),
    ).toBe(3);
  });

  it('clips partial weeks to the exact days of the transaction query', () => {
    expect(
      countForReport(
        '2026-06-30',
        '2026-07-09',
        'Weekly',
        [{ date: '2026-06-29' }, { date: '2026-07-10' }],
        'or',
        '1',
      ),
    ).toBe(0);
  });

  it('counts individual dates, including leap day, within the report range', () => {
    expect(
      countForReport(
        '2024-02-28',
        '2024-03-01',
        'Daily',
        [{ date: { $gt: '2024-02-28' } }, { date: { $lt: '2024-03-02' } }],
        'and',
      ),
    ).toBe(2);
  });

  it('counts no daily periods when the report starts after it ends', () => {
    expect(
      countForReport(
        '2026-07-04',
        '2026-07-01',
        'Daily',
        [{ date: '2026-07-01' }],
        'and',
      ),
    ).toBe(0);
  });

  it('stops after the last day of the four-digit year range', () => {
    expect(
      countForReport(
        '9999-12-31',
        '9999-12-31',
        'Daily',
        [{ date: '9999-12-30' }],
        'and',
      ),
    ).toBe(0);
  });

  it('counts a calendar date skipped by some local timezones', () => {
    expect(
      countForReport(
        '2011-12-01',
        '2011-12-31',
        'Monthly',
        [{ date: '2011-12-30' }],
        'and',
      ),
    ).toBe(1);
  });
});
