import * as monthUtils from '#shared/months';
import type { TimeFrame } from '#types/models';

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([key, nestedValue]) =>
          `${JSON.stringify(key)}:${stableStringify(nestedValue)}`,
      )
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function getLatestRange(offset: number) {
  const end = monthUtils.currentMonth();
  const start = monthUtils.subMonths(end, offset);
  return [start, end, 'sliding-window'] as const;
}

export function calculateTimeRange(
  timeFrame?: Partial<TimeFrame>,
  defaultTimeFrame?: TimeFrame,
  latestTransaction?: string | null,
) {
  const start =
    timeFrame?.start ??
    defaultTimeFrame?.start ??
    monthUtils.subMonths(monthUtils.currentMonth(), 5);
  const end =
    timeFrame?.end ?? defaultTimeFrame?.end ?? monthUtils.currentMonth();
  const mode = timeFrame?.mode ?? defaultTimeFrame?.mode ?? 'sliding-window';

  if (mode === 'full') {
    const latestTransactionMonth = latestTransaction
      ? monthUtils.monthFromDate(latestTransaction)
      : null;
    const currentMonth = monthUtils.currentMonth();
    const fullEnd =
      latestTransactionMonth &&
      monthUtils.isAfter(latestTransactionMonth, currentMonth)
        ? latestTransactionMonth
        : currentMonth;
    return [start, fullEnd, 'full'] as const;
  }
  if (mode === 'sliding-window') {
    const offset = monthUtils.differenceInCalendarMonths(end, start);
    if (start > end) {
      return [
        monthUtils.currentMonth(),
        monthUtils.subMonths(monthUtils.currentMonth(), -offset),
        'sliding-window',
      ] as const;
    }
    return getLatestRange(offset);
  }
  if (mode === 'lastMonth') {
    const lastMonth = monthUtils.subMonths(monthUtils.currentMonth(), 1);
    return [lastMonth, lastMonth, 'lastMonth'] as const;
  }
  if (mode === 'lastYear') {
    return [
      monthUtils.getYearStart(monthUtils.prevYear(monthUtils.currentMonth())),
      monthUtils.getYearEnd(monthUtils.prevYear(monthUtils.currentDate())),
      'lastYear',
    ] as const;
  }
  if (mode === 'yearToDate') {
    return [
      monthUtils.currentYear() + '-01',
      monthUtils.currentMonth(),
      'yearToDate',
    ] as const;
  }
  if (mode === 'priorYearToDate') {
    return [
      monthUtils.getYearStart(monthUtils.prevYear(monthUtils.currentMonth())),
      monthUtils.prevYear(monthUtils.currentDate(), 'yyyy-MM-dd'),
      'priorYearToDate',
    ] as const;
  }
  return [start, end, 'static'] as const;
}
