import * as monthUtils from '@actual-app/core/shared/months';
import type { CalendarWidget } from '@actual-app/core/types/models';

/** The most calendar months a dashboard calendar card can show side by side. */
export const CALENDAR_CARD_MAX_MONTHS = 4;

/** What a calendar card shows when nothing else was configured. */
export const CALENDAR_CARD_DEFAULT_MONTHS = 1;

export const CALENDAR_CARD_MONTH_OPTIONS = Array.from(
  { length: CALENDAR_CARD_MAX_MONTHS },
  (_, index) => index + 1,
);

/**
 * Normalizes the `monthsShown` widget setting to a whole number within the
 * supported range, or `undefined` when the setting is absent/invalid.
 */
export function normalizeMonthsShown(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  const rounded = Math.round(value);
  if (rounded < 1) {
    return undefined;
  }
  return Math.min(rounded, CALENDAR_CARD_MAX_MONTHS);
}

/**
 * The day range covering the last `monthsShown` calendar months, ending today
 * (or on the latest transaction when that is in the future): from the first
 * day of the earliest month up to the last day that has data.
 */
export function getMonthsShownRange(
  monthsShown: number,
  latestTransaction?: string,
  today: string = monthUtils.currentDay(),
): [string, string] {
  const months =
    normalizeMonthsShown(monthsShown) ?? CALENDAR_CARD_DEFAULT_MONTHS;
  const end =
    latestTransaction && latestTransaction > today ? latestTransaction : today;
  const start = monthUtils.firstDayOfMonth(
    monthUtils.subMonths(monthUtils.getMonth(end), months - 1),
  );
  return [start, end];
}

/**
 * Resolves the months a calendar card should show from its metadata. Cards
 * created before the setting existed (and cards saved with an explicit custom
 * range from the full report) have no `monthsShown`, so `undefined` means
 * "derive the range from `timeFrame`".
 */
export function getCalendarCardMonthsShown(
  meta: CalendarWidget['meta'] | undefined,
): number | undefined {
  if (!meta) {
    return CALENDAR_CARD_DEFAULT_MONTHS;
  }
  const normalized = normalizeMonthsShown(meta.monthsShown);
  if (normalized !== undefined) {
    return normalized;
  }
  // No explicit month count and no custom range: show the default.
  return meta.timeFrame ? undefined : CALENDAR_CARD_DEFAULT_MONTHS;
}
