import { describe, expect, it } from 'vitest';

import {
  calculateSpendingReportTimeRange,
  calculateTimeRange,
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
