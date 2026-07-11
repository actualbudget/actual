import type { ReactNode } from 'react';

import { isValidYearMonth } from '@actual-app/core/shared/months';

/**
 * Granularity the picker operates at: `month` values are `yyyy-MM`, `day`
 * values are `yyyy-MM-dd`. (A custom picker rather than a native
 * `<input type="month">`, which Firefox and Safari don't support.)
 */
export type MonthRangeGranularity = 'month' | 'day';

export type QuickSelectPreset = {
  key: string;
  label: ReactNode;
  onSelect: () => void;
};

// Whether a value is day-shaped (`yyyy-MM-dd`) rather than month-shaped
// (`yyyy-MM`).
export function valueIsDay(value: string): boolean {
  return !isValidYearMonth(value);
}

// Clamp an ISO date string to [min, max]; all three must share a granularity.
export function clamp(value: string, min: string, max: string): string {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

// Where a cell falls relative to a (start, end) range, for the band highlight.
export type RangePosition = 'start' | 'end' | 'middle' | null;

export function rangePosition(
  cell: string,
  start: string,
  end: string,
): RangePosition {
  if (cell < start || cell > end) return null;
  if (cell === start) return 'start';
  if (cell === end) return 'end';
  return 'middle';
}
