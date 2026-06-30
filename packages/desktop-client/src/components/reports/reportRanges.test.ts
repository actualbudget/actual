import * as monthUtils from '@actual-app/core/shared/months';
import { describe, expect, it } from 'vitest';

import {
  calculateSpendingReportTimeRange,
  calculateTimeRange,
  getFullFutureRange,
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

  it('keeps a month-only sliding window anchored to the current month', () => {
    const [start, end, mode] = calculateTimeRange({
      start: '2024-01',
      end: '2024-03',
      mode: 'sliding-window',
    });

    expect(start).toBe('2016-11');
    expect(end).toBe('2017-01');
    expect(mode).toBe('sliding-window');
  });

  it('keeps a day-level sliding window anchored to the current month', () => {
    const [start, end, mode] = calculateTimeRange({
      start: '2024-01-01',
      end: '2024-03-31',
      mode: 'sliding-window',
    });

    expect(start).toBe('2016-11');
    expect(end).toBe('2017-01');
    expect(mode).toBe('sliding-window');
  });

  it('treats a same-month sliding window as the current month', () => {
    const [start, end, mode] = calculateTimeRange({
      start: '2024-03-01',
      end: '2024-03-31',
      mode: 'sliding-window',
    });

    expect(start).toBe('2017-01');
    expect(end).toBe('2017-01');
    expect(mode).toBe('sliding-window');
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
