import * as monthUtils from '@actual-app/core/shared/months';
import { describe, expect, it } from 'vitest';

import {
  calculateSpendingReportTimeRange,
  calculateTimeRange,
  getFullFutureRange,
  getLatestRange,
} from './reportRanges';

// In test mode, monthUtils.currentMonth() returns '2017-01'
describe('calculateTimeRange', () => {
  it('keeps last month as a live time range when restoring a saved widget', () => {
    const [start, end, mode] = calculateTimeRange({
      start: '2016-11',
      end: '2016-11',
      mode: 'lastMonth',
    });

    expect(start).toBe('2016-12');
    expect(end).toBe('2016-12');
    expect(mode).toBe('lastMonth');
  });

  it('anchors a live window that ends at the current month to now', () => {
    // Saved 6-month window ending at the (then-)current month.
    const [start, end, mode] = calculateTimeRange({
      start: '2016-08',
      end: '2017-01',
      mode: 'sliding-window',
    });

    expect(start).toBe('2016-08');
    expect(end).toBe('2017-01');
    expect(mode).toBe('sliding-window');
  });

  it('anchors a live window that ends before the current month to now', () => {
    // Saved 6-month window ending one month before the (then-)current month;
    // a live window always slides so its end is the current month.
    const [start, end, mode] = calculateTimeRange({
      start: '2016-07',
      end: '2016-12',
      mode: 'sliding-window',
    });

    expect(end).toBe('2017-01');
    expect(start).toBe('2016-08'); // width of 5 preserved
    expect(mode).toBe('sliding-window');
  });

  it('anchors a live day-shaped window to today, preserving its width in days', () => {
    const [start, end, mode] = calculateTimeRange({
      start: '2016-12-15',
      end: '2016-12-29',
      mode: 'sliding-window',
    });

    expect(end).toBe('2017-01-01'); // currentDay() in test mode
    expect(start).toBe('2016-12-18'); // width of 14 days preserved
    expect(mode).toBe('sliding-window');
  });
});

// In test mode, monthUtils.currentMonth() returns '2017-01'
describe('getLatestRange', () => {
  it('ends at the current month', () => {
    expect(getLatestRange(5)).toEqual(['2016-08', '2017-01', 'sliding-window']);
  });
});

// In test mode, monthUtils.currentMonth() returns '2017-01'
describe('calculateSpendingReportTimeRange', () => {
  it('preserves the saved compare month for live average reports', () => {
    const [compare, compareTo] = calculateSpendingReportTimeRange({
      compare: '2016-12',
      isLive: true,
      mode: 'average',
    });

    expect(compare).toBe('2016-12');
    expect(compareTo).toBe('2016-12');
  });

  it('preserves the saved compare month for live budget reports', () => {
    const [compare, compareTo] = calculateSpendingReportTimeRange({
      compare: '2016-12',
      isLive: true,
      mode: 'budget',
    });

    expect(compare).toBe('2016-12');
    expect(compareTo).toBe('2016-12');
  });

  it('preserves the saved compare months for live single month reports', () => {
    const [compare, compareTo] = calculateSpendingReportTimeRange({
      compare: '2016-12',
      compareTo: '2016-11',
      isLive: true,
      mode: 'single-month',
    });

    expect(compare).toBe('2016-12');
    expect(compareTo).toBe('2016-11');
  });

  it('defaults live average reports to the current month without a saved compare month', () => {
    const [compare, compareTo] = calculateSpendingReportTimeRange({
      isLive: true,
      mode: 'average',
    });

    expect(compare).toBe('2017-01');
    expect(compareTo).toBe('2017-01');
  });
});

describe('getFullFutureRange', () => {
  it('uses a future month as the end of the range', () => {
    const start = monthUtils.currentMonth();
    const futureMonth = monthUtils.addMonths(start, 36);

    expect(getFullFutureRange(futureMonth)).toEqual([
      start,
      futureMonth,
      'static',
    ]);
  });

  it('falls back to a default future horizon without a future month', () => {
    const start = monthUtils.currentMonth();

    expect(getFullFutureRange()).toEqual([
      start,
      monthUtils.addMonths(start, 24),
      'static',
    ]);
  });
});
