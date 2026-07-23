import type { ReactNode } from 'react';

import {
  endOfMonth,
  getLocalTimeZone,
  parseDate,
  today,
} from '@internationalized/date';

/**
 * Granularity the picker operates at: `month` values are `yyyy-MM`, `day`
 * values are `yyyy-MM-dd`. (A custom picker rather than a native
 * `<input type="month">`, which Firefox and Safari don't support.)
 */
export type DateRangeGranularity = 'month' | 'day';

export type DateRangePreset = {
  key: string;
  label: ReactNode;
  /** The range shown in the still-open picker when the preset is clicked. */
  getRange: () => [string, string];
  /** Commits the preset; called on close if it is still the selection. */
  onSelect: () => void;
};

/** All user-facing strings, translated by the caller. */
export type DateRangePickerLabels = {
  /** Heading above the granularity toggle, e.g. "Select by". */
  selectBy: string;
  /** Heading above the presets, e.g. "Quick select". */
  quickSelect: string;
  /** Granularity toggle segments. */
  month: string;
  day: string;
  /** Year navigation arrows in the month grid. */
  previous: string;
  next: string;
  /** Month navigation arrows in the day calendar. */
  previousMonth: string;
  nextMonth: string;
  /** Year dropdown in the day calendar header. */
  year: string;
  /** Accessible name of the day calendar. */
  dateRange: string;
};

export type FirstDayOfWeek =
  | 'sun'
  | 'mon'
  | 'tue'
  | 'wed'
  | 'thu'
  | 'fri'
  | 'sat';

// Whether a value is day-shaped (`yyyy-MM-dd`) rather than month-shaped
// (`yyyy-MM`).
export function valueIsDay(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  const day = Number(match[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
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

// Plain string date helpers — the small loot-core/date-fns subset the picker
// needs, since the library can depend on neither. Built on Intl and the
// already-present `@internationalized/date`; values are local dates, never
// timezone-shifted.

function toDate(value: string): Date {
  const [year, month = 1, day = 1] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Intl.DateTimeFormat construction is expensive and the picker uses only a
// handful of (locale, options) shapes, so cache the formatters.
const formatters = new Map<string, Intl.DateTimeFormat>();

export function formatDate(
  value: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, formatter);
  }
  return formatter.format(toDate(value));
}

export function getYear(value: string): string {
  return value.slice(0, 4);
}

export function getMonth(value: string): string {
  return value.slice(0, 7);
}

export function firstDayOfMonth(value: string): string {
  return `${getMonth(value)}-01`;
}

export function lastDayOfMonth(value: string): string {
  return endOfMonth(parseDate(firstDayOfMonth(value))).toString();
}

export function currentDay(): string {
  return today(getLocalTimeZone()).toString();
}

export function currentMonth(): string {
  return getMonth(currentDay());
}

export function monthFromIndex(year: string, index: number): string {
  return `${year}-${String(index + 1).padStart(2, '0')}`;
}
