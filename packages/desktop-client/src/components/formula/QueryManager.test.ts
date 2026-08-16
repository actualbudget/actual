import { describe, expect, it } from 'vitest';

import {
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
    expect(normalizeMonthPickerSelectionForQuery('2026-02', '2026-04')).toEqual([
      '2026-02-01',
      '2026-04-30',
    ]);
  });
});
