import type { ReactNode } from 'react';

/**
 * Granularity the picker operates at: `month` values are `yyyy-MM`, `day`
 * values are `yyyy-MM-dd`. (A custom picker rather than a native
 * `<input type="month">`, which Firefox and Safari don't support.)
 */
export type DateRangeGranularity = 'month' | 'day';

export type DateRangePreset = {
  key: string;
  label: ReactNode;
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

// Plain string/Intl date helpers — the small loot-core/date-fns subset the
// picker needs, since the library can depend on neither. Values are local
// dates, never timezone-shifted.

function toDate(value: string): Date {
  const [year, month = 1, day = 1] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(
  value: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, options).format(toDate(value));
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
  const [year, month] = value.split('-').map(Number);
  // Day 0 of the next month; always two digits (28-31).
  return `${getMonth(value)}-${new Date(year, month, 0).getDate()}`;
}

export function currentDay(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function currentMonth(): string {
  return getMonth(currentDay());
}

export function monthFromIndex(year: string, index: number): string {
  return `${year}-${String(index + 1).padStart(2, '0')}`;
}
