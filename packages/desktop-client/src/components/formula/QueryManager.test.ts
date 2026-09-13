import * as monthUtils from '@actual-app/core/shared/months';
import { describe, expect, it } from 'vitest';

import {
  calculateDateRangeBoundMonths,
  canRenderDateRangePicker,
  normalizeMonthPickerSelectionForQuery,
  normalizeMonthRangeForPicker,
  shouldIgnoreMonthPickerNoop,
} from './QueryManager';

describe('QueryManager month-only DateRangePicker helpers', () => {
  it('normalizes day-shaped range to month-shaped picker values', () => {
    expect(normalizeMonthRangeForPicker('2026-02-01', '2026-02-17')).toEqual([
      '2026-02',
      '2026-02',
    ]);
  });

  it('treats day-shaped range and equivalent month selection as a no-op', () => {
    expect(
      shouldIgnoreMonthPickerNoop(
        '2026-01-01',
        '2026-03-15',
        '2026-01',
        '2026-03',
      ),
    ).toBe(true);
  });

  it('does not ignore actual month changes from the picker', () => {
    expect(
      shouldIgnoreMonthPickerNoop(
        '2026-01-01',
        '2026-03-15',
        '2026-02',
        '2026-03',
      ),
    ).toBe(false);
  });

  it('normalizes month-only picker selection to day-shaped query bounds', () => {
    expect(normalizeMonthPickerSelectionForQuery('2026-02', '2026-04')).toEqual(
      ['2026-02-01', '2026-04-30'],
    );
  });

  it('waits to enable the picker until transaction bounds finish loading', () => {
    expect(canRenderDateRangePicker(false, '2026-01', '2026-12')).toBe(false);
    expect(canRenderDateRangePicker(true, '', '2026-12')).toBe(false);
    expect(canRenderDateRangePicker(true, '2026-01', '2026-12')).toBe(true);
  });

  it('falls back to current-month bounds when transaction lookups fail', () => {
    const currentMonth = monthUtils.currentMonth();
    const currentDay = monthUtils.currentDay();

    expect(calculateDateRangeBoundMonths(null, null)).toEqual({
      earliestMonth: currentMonth,
      latestMonth: currentMonth,
      earliestTransactionDate: currentDay,
      latestTransactionDate: currentDay,
    });
  });
});
