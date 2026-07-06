import type { ReactNode } from 'react';

import * as monthUtils from '@actual-app/core/shared/months';

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

// Expand a value to the first day of its month (`yyyy-MM` or `yyyy-MM-dd` in →
// `yyyy-MM-dd`). Used when switching a range start from month to day mode so it
// still covers the whole month.
export function toDayStart(value: string): string {
  return monthUtils.firstDayOfMonth(`${toMonth(value)}-01`);
}

// Expand a value to the last day of its month. Used for a range end switching
// from month to day mode.
export function toDayEnd(value: string): string {
  return monthUtils.lastDayOfMonth(`${toMonth(value)}-01`);
}

// Clamp an ISO date string to [min, max]. Operands must share a granularity;
// ISO strings compare lexicographically so this works for months and days.
export function clamp(value: string, min: string, max: string): string {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
