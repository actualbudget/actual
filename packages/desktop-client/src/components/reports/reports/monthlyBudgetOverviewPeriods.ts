import * as monthUtils from '@actual-app/core/shared/months';
import type { MonthlyBudgetOverviewPeriod } from '@actual-app/core/types/models';

export type { MonthlyBudgetOverviewPeriod };

export const MONTHLY_BUDGET_OVERVIEW_PERIODS: MonthlyBudgetOverviewPeriod[] = [
  'this-month',
  'next-month',
  'year-to-date',
  'to-end-of-year',
  'next-three-months',
  'next-six-months',
];

export const MONTHLY_BUDGET_OVERVIEW_PERIOD_OPTIONS: Array<
  MonthlyBudgetOverviewPeriod | 'custom'
> = ['custom', ...MONTHLY_BUDGET_OVERVIEW_PERIODS];

export function detectMonthlyBudgetOverviewPeriod(
  startMonth: string,
  endMonth: string,
  anchorMonth: string,
): MonthlyBudgetOverviewPeriod | 'custom' {
  for (const period of MONTHLY_BUDGET_OVERVIEW_PERIODS) {
    const range = getMonthlyBudgetOverviewRange(anchorMonth, period);
    if (range.startMonth === startMonth && range.endMonth === endMonth) {
      return period;
    }
  }

  for (const period of MONTHLY_BUDGET_OVERVIEW_PERIODS) {
    const range = getMonthlyBudgetOverviewRange(startMonth, period);
    if (range.startMonth === startMonth && range.endMonth === endMonth) {
      return period;
    }
  }

  return 'custom';
}

export function applyMonthlyBudgetOverviewPeriod(
  anchorMonth: string,
  period: MonthlyBudgetOverviewPeriod | 'custom',
): { startMonth: string; endMonth: string } | null {
  if (period === 'custom') {
    return null;
  }

  return getMonthlyBudgetOverviewRange(anchorMonth, period);
}

export function getMonthlyBudgetOverviewRange(
  anchorMonth: string,
  period: MonthlyBudgetOverviewPeriod,
): { startMonth: string; endMonth: string } {
  const year = anchorMonth.slice(0, 4);

  switch (period) {
    case 'this-month':
      return { startMonth: anchorMonth, endMonth: anchorMonth };
    case 'next-month': {
      const next = monthUtils.addMonths(anchorMonth, 1);
      return { startMonth: next, endMonth: next };
    }
    case 'year-to-date':
      return { startMonth: `${year}-01`, endMonth: anchorMonth };
    case 'to-end-of-year':
      return { startMonth: anchorMonth, endMonth: `${year}-12` };
    case 'next-three-months':
      return {
        startMonth: anchorMonth,
        endMonth: monthUtils.addMonths(anchorMonth, 2),
      };
    case 'next-six-months':
      return {
        startMonth: anchorMonth,
        endMonth: monthUtils.addMonths(anchorMonth, 5),
      };
    default:
      period satisfies never;
      return { startMonth: anchorMonth, endMonth: anchorMonth };
  }
}

export function getMonthlyBudgetOverviewPeriodLabel(
  period: MonthlyBudgetOverviewPeriod | 'custom',
  t: (key: string) => string,
): string {
  switch (period) {
    case 'custom':
      return t('Custom');
    case 'this-month':
      return t('This month');
    case 'next-month':
      return t('Next month');
    case 'year-to-date':
      return t('Year to date');
    case 'to-end-of-year':
      return t('Date to end of year');
    case 'next-three-months':
      return t('Next three months');
    case 'next-six-months':
      return t('Next six months');
    default:
      period satisfies never;
      return '';
  }
}
