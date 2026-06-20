import * as monthUtils from '@actual-app/core/shared/months';
import type { MonthlyBudgetOverviewPeriod } from '@actual-app/core/types/models';

export type { MonthlyBudgetOverviewPeriod };

export const MONTHLY_BUDGET_OVERVIEW_PERIODS: MonthlyBudgetOverviewPeriod[] = [
  'this-month',
  'next-month',
  'last-month',
];

export function getMonthlyBudgetOverviewMonth(
  period: MonthlyBudgetOverviewPeriod,
): string {
  const currentMonth = monthUtils.currentMonth();

  switch (period) {
    case 'this-month':
      return currentMonth;
    case 'next-month':
      return monthUtils.addMonths(currentMonth, 1);
    case 'last-month':
      return monthUtils.subMonths(currentMonth, 1);
    default:
      period satisfies never;
      return currentMonth;
  }
}

export function detectMonthlyBudgetOverviewPeriod(
  month: string,
): MonthlyBudgetOverviewPeriod | null {
  const currentMonth = monthUtils.currentMonth();

  if (month === currentMonth) {
    return 'this-month';
  }

  if (month === monthUtils.addMonths(currentMonth, 1)) {
    return 'next-month';
  }

  if (month === monthUtils.subMonths(currentMonth, 1)) {
    return 'last-month';
  }

  return null;
}

export function getMonthlyBudgetOverviewPeriodLabel(
  period: MonthlyBudgetOverviewPeriod,
  t: (key: string) => string,
): string {
  switch (period) {
    case 'this-month':
      return t('This month');
    case 'next-month':
      return t('Next month');
    case 'last-month':
      return t('Last month');
    default:
      period satisfies never;
      return '';
  }
}
