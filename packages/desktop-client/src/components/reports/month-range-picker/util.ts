import type { ReactNode } from 'react';

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

// Clamp an ISO date string to [min, max]. Operands must share a granularity;
// ISO strings compare lexicographically so this works for months and days.
export function clamp(value: string, min: string, max: string): string {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
