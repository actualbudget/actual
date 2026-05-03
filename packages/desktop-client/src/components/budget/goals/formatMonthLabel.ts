import * as monthUtils from '@actual-app/core/shared/months';

// Format a YYYY-MM string as "MMM yyyy" using the active locale (matching
// the convention used elsewhere in the codebase via monthUtils.format).
// Falls back to the raw input if it doesn't look like YYYY-MM, and to "—"
// for empty/missing values so callers don't need their own guards.
export function formatMonthLabel(
  month: string | undefined | null,
  locale?: Parameters<typeof monthUtils.format>[2],
): string {
  if (!month) return '—';
  if (!monthUtils.isValidYearMonth(month)) return month;
  return monthUtils.format(`${month}-01`, 'MMM yyyy', locale);
}
