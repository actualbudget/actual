import type { DateRangePreset } from '@actual-app/components/date-range-picker';
import * as monthUtils from '@actual-app/core/shared/months';
import type { BalanceForecastWidget } from '@actual-app/core/types/models';
import type { ForecastSource } from '@actual-app/core/types/models/forecast';
import {
  addDays,
  addMonths,
  differenceInMonths,
  format,
  parseISO,
  subDays,
} from 'date-fns';

import { calculateTimeRange } from '#components/reports/reportRanges';

export function getForecastRangeFromToday(
  months: number,
  today = monthUtils.currentDay(),
): [string, string] {
  // The anniversary is exclusive; date-fns clamps it for shorter months.
  const end = subDays(addMonths(parseISO(today), months), 1);
  return [today, format(end, 'yyyy-MM-dd')];
}

export function getForecastRangeMonths(start: string, end: string): number {
  // Count complete months through the inclusive end, not touched calendar months.
  const months =
    !monthUtils.isValidYearMonth(start) && !monthUtils.isValidYearMonth(end)
      ? differenceInMonths(addDays(parseISO(end), 1), parseISO(start))
      : monthUtils.differenceInCalendarMonths(end, start) + 1;

  return Math.max(1, months);
}

export function resolveBalanceForecastRange(
  meta?: BalanceForecastWidget['meta'],
  source: ForecastSource = meta?.source ?? 'schedules',
  today = monthUtils.currentDay(),
) {
  const currentMonth = monthUtils.getMonth(today);
  const monthsFromToday =
    source === 'schedules' &&
    meta?.monthsFromToday !== undefined &&
    Number.isInteger(meta.monthsFromToday) &&
    meta.monthsFromToday > 0
      ? meta.monthsFromToday
      : undefined;

  const [start, end] = monthsFromToday
    ? getForecastRangeFromToday(monthsFromToday, today)
    : calculateTimeRange(
        meta?.timeFrame ?? {
          start: meta?.startDate,
          end: meta?.endDate,
          mode: 'static',
        },
        {
          start: currentMonth,
          end: monthUtils.addMonths(currentMonth, 11),
          mode: 'static',
        },
      );

  return {
    start,
    end,
    monthsFromToday,
    // Keep the existing query behavior for fixed ranges and saved widgets.
    startDate: monthsFromToday ? start : monthUtils.firstDayOfMonth(start),
    endDate: monthsFromToday ? end : monthUtils.lastDayOfMonth(end),
  };
}

export function buildFromTodayForecastPresets(
  t: (text: string) => string,
  onSelectMonths: (months: number) => void,
): DateRangePreset[] {
  return [
    { months: 3, label: t('Next 3 months') },
    { months: 6, label: t('Next 6 months') },
    { months: 12, label: t('Next year') },
  ].map(({ months, label }) => ({
    key: `from-today-${months}`,
    label,
    getRange: () => getForecastRangeFromToday(months),
    onSelect: () => onSelectMonths(months),
  }));
}
