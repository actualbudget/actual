import * as monthUtils from '@actual-app/core/shared/months';
import type { Locale } from 'date-fns';

export function formatBudgetMonthRange(
  startMonth: string,
  numMonths: number,
  locale?: Locale,
): string {
  if (numMonths <= 1) {
    return monthUtils.format(startMonth, 'MMMM yyyy', locale);
  }

  const endMonth = monthUtils.addMonths(startMonth, numMonths - 1);
  const isSameYear =
    monthUtils.getYear(startMonth) === monthUtils.getYear(endMonth);

  const formattedStart = monthUtils.format(
    startMonth,
    isSameYear ? 'MMM' : 'MMM yyyy',
    locale,
  );
  const formattedEnd = monthUtils.format(endMonth, 'MMM yyyy', locale);

  return `${formattedStart} – ${formattedEnd}`;
}
