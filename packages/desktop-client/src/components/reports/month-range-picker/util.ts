import type { ReactNode } from 'react';

import {
  addMonths,
  firstDayOfMonth,
  lastDayOfMonth,
  subMonths,
} from '@actual-app/core/shared/months';
import { addMonths as addMonthsDate, format, parseISO } from 'date-fns';

/**
 * Granularity the picker operates at.
 *
 * - `month`: values are `yyyy-MM`; the grid selects whole months. This is what
 *   every report currently uses.
 * - `day`: values are `yyyy-MM-dd`; picking a month reveals a day grid so a
 *   report that renders daily data (e.g. cash flow) can pick a precise range.
 *
 * The picker is built from React + Actual's own components rather than a native
 * `<input type="month">` so it renders and behaves identically across browsers
 * (the native month input is unsupported in Firefox and Safari).
 */
export type MonthRangeGranularity = 'month' | 'day';

export type QuickSelectPreset = {
  key: string;
  label: ReactNode;
  onSelect: () => void;
};

export function toMonth(value: string): string {
  return value.slice(0, 7);
}

// Whether a range value is day-shaped (`yyyy-MM-dd`, length 10) rather than
// month-shaped (`yyyy-MM`, length 7). Used to display and interpret a value
// by its actual shape instead of relying on a possibly-stale granularity flag.
export function valueIsDay(value: string): boolean {
  return value.length > 7;
}

// Expand a value to the first day of its month (`yyyy-MM` or `yyyy-MM-dd` in →
// `yyyy-MM-dd`). Used when switching a range start from month to day mode so it
// still covers the whole month.
export function toDayStart(value: string): string {
  return firstDayOfMonth(`${toMonth(value)}-01`);
}

// Expand a value to the last day of its month. Used for a range end switching
// from month to day mode.
export function toDayEnd(value: string): string {
  return lastDayOfMonth(`${toMonth(value)}-01`);
}

// Shift a range value by `n` months while preserving its shape: a month value
// (`yyyy-MM`) stays a month value, a day value (`yyyy-MM-dd`) keeps its
// day-of-month (clamped by date-fns when the target month is shorter). Used by
// the "exclude current month" toggle to slide a range without changing width.
export function shiftMonths(value: string, n: number): string {
  if (valueIsDay(value)) {
    return format(addMonthsDate(parseISO(value), n), 'yyyy-MM-dd');
  }
  return n < 0 ? subMonths(value, -n) : addMonths(value, n);
}

// Clamp an ISO date string to [min, max], normalizing the bounds to `value`'s
// own granularity first so the result always matches `value`'s shape even
// when `min`/`max` are passed in the other granularity (e.g. a month-shaped
// `minDate` while the picker is in day mode). ISO strings compare
// lexicographically so this works for months and days.
export function clamp(value: string, min: string, max: string): string {
  const isDay = valueIsDay(value);
  const loBound = isDay ? toDayStart(min) : toMonth(min);
  const hiBound = isDay ? toDayEnd(max) : toMonth(max);
  if (value < loBound) return loBound;
  if (value > hiBound) return hiBound;
  return value;
}

// Where a cell falls relative to a (start, end) range, for the single-grid
// range picker's band highlight. `start`/`end` mark the rounded outer edges
// of the band (a single-cell range is both); values strictly between them
// are the flat-filled band interior; everything else is outside the range.
export type RangePosition = 'start' | 'end' | 'middle' | null;

export function rangePosition(
  cell: string,
  start: string,
  end: string,
): RangePosition {
  if (cell < start || cell > end) return null;
  if (cell === start && cell === end) return 'start';
  if (cell === start) return 'start';
  if (cell === end) return 'end';
  return 'middle';
}
