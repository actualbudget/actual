import type { ReactNode } from 'react';

import {
  addMonths,
  dayFromDate,
  firstDayOfMonth,
  lastDayOfMonth,
  parseDate,
  subMonths,
} from '@actual-app/core/shared/months';
import { addMonths as addMonthsDate } from 'date-fns';

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

export function toMonth(value: string): string {
  return value.slice(0, 7);
}

// Whether a value is day-shaped (`yyyy-MM-dd`) rather than month-shaped
// (`yyyy-MM`).
export function valueIsDay(value: string): boolean {
  return value.length > 7;
}

export function toDayStart(value: string): string {
  return firstDayOfMonth(value);
}

export function toDayEnd(value: string): string {
  return lastDayOfMonth(value);
}

// Shift a value by `n` months, preserving its month/day shape.
export function shiftMonths(value: string, n: number): string {
  if (valueIsDay(value)) {
    return dayFromDate(addMonthsDate(parseDate(value), n));
  }
  return n < 0 ? subMonths(value, -n) : addMonths(value, n);
}

// Clamp an ISO date string to [min, max], normalizing the bounds to `value`'s
// own granularity so the result keeps `value`'s shape. Month-shaped bounds
// widen to whole months in day mode; day-shaped bounds stay exact.
export function clamp(value: string, min: string, max: string): string {
  const isDay = valueIsDay(value);
  const loBound = isDay
    ? valueIsDay(min)
      ? min
      : toDayStart(min)
    : toMonth(min);
  const hiBound = isDay
    ? valueIsDay(max)
      ? max
      : toDayEnd(max)
    : toMonth(max);
  if (value < loBound) return loBound;
  if (value > hiBound) return hiBound;
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
