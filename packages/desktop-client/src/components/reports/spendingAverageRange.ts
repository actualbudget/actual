import * as monthUtils from '@actual-app/core/shared/months';
import type { SpendingAverageRange } from '@actual-app/core/types/models';

export type SpendingAverageRangeKey =
  | 'last-3-months'
  | 'last-6-months'
  | 'last-12-months'
  | 'year-to-date'
  | 'all-time';

export const DEFAULT_SPENDING_AVERAGE_RANGE: SpendingAverageRange = {
  mode: 'last-n-months',
  months: 3,
};

const supportedLastNMonths = [3, 6, 12] as const;

function isSupportedLastNMonths(
  months: number,
): months is (typeof supportedLastNMonths)[number] {
  return supportedLastNMonths.some(supported => supported === months);
}

export function normalizeSpendingAverageRange(
  averageRange?: SpendingAverageRange,
): SpendingAverageRange {
  if (!averageRange) {
    return DEFAULT_SPENDING_AVERAGE_RANGE;
  }

  if (
    averageRange.mode === 'last-n-months' &&
    !isSupportedLastNMonths(averageRange.months)
  ) {
    return DEFAULT_SPENDING_AVERAGE_RANGE;
  }

  return averageRange;
}

export function spendingAverageRangeFromKey(key: string): SpendingAverageRange {
  switch (key) {
    case 'last-6-months':
      return { mode: 'last-n-months', months: 6 };
    case 'last-12-months':
      return { mode: 'last-n-months', months: 12 };
    case 'year-to-date':
      return { mode: 'year-to-date' };
    case 'all-time':
      return { mode: 'all-time' };
    case 'last-3-months':
    default:
      return DEFAULT_SPENDING_AVERAGE_RANGE;
  }
}

export function spendingAverageRangeToKey(
  averageRange?: SpendingAverageRange,
): SpendingAverageRangeKey {
  const normalizedRange = normalizeSpendingAverageRange(averageRange);

  switch (normalizedRange.mode) {
    case 'last-n-months':
      return `last-${normalizedRange.months}-months`;
    case 'year-to-date':
      return 'year-to-date';
    case 'all-time':
      return 'all-time';
    default:
      return 'last-3-months';
  }
}

type ResolveSpendingAverageRangeProps = {
  averageRange?: SpendingAverageRange;
  compare: string;
  earliestMonth?: string | null;
};

type ResolvedSpendingAverageRange = {
  startMonth: string | null;
  endMonth: string | null;
  months: string[];
};

export function resolveSpendingAverageRange({
  averageRange,
  compare,
  earliestMonth,
}: ResolveSpendingAverageRangeProps): ResolvedSpendingAverageRange {
  const normalizedRange = normalizeSpendingAverageRange(averageRange);
  const endMonth = monthUtils.subMonths(compare, 1);
  let startMonth: string | null;

  switch (normalizedRange.mode) {
    case 'last-n-months':
      startMonth = monthUtils.subMonths(compare, normalizedRange.months);
      break;
    case 'year-to-date':
      startMonth = `${monthUtils.getYear(compare)}-01`;
      break;
    case 'all-time':
      startMonth = earliestMonth ?? null;
      break;
    default:
      startMonth = monthUtils.subMonths(compare, 3);
      break;
  }

  if (!startMonth || startMonth > endMonth) {
    return {
      startMonth: null,
      endMonth: null,
      months: [],
    };
  }

  return {
    startMonth,
    endMonth,
    months: monthUtils.rangeInclusive(startMonth, endMonth),
  };
}

type Translate = (
  key: string,
  options?: Record<string, string | number>,
) => string;

export function getSpendingAverageRangeLabel(
  averageRange: SpendingAverageRange | undefined,
  t: Translate,
): string {
  const normalizedRange = normalizeSpendingAverageRange(averageRange);

  switch (normalizedRange.mode) {
    case 'last-n-months':
      return t('Last {{count}} months', { count: normalizedRange.months });
    case 'year-to-date':
      return t('YTD');
    case 'all-time':
      return t('All time');
    default:
      return t('Last 3 months');
  }
}

export function getSpendingAverageSummaryLabel({
  averageRange,
  isCurrentMonth,
  t,
}: {
  averageRange?: SpendingAverageRange;
  isCurrentMonth: boolean;
  t: Translate;
}): string {
  const rangeLabel = getSpendingAverageRangeLabel(averageRange, t);

  return isCurrentMonth
    ? t('Spent Average MTD ({{rangeLabel}}):', { rangeLabel })
    : t('Spent Average ({{rangeLabel}}):', { rangeLabel });
}

export function getSpendingAverageRangeOptions(
  t: Translate,
): Array<readonly [SpendingAverageRangeKey, string]> {
  return [
    ['last-3-months', t('Last 3 months')],
    ['last-6-months', t('Last 6 months')],
    ['last-12-months', t('Last 12 months')],
    ['year-to-date', t('YTD')],
    ['all-time', t('All time')],
  ];
}
