import * as monthUtils from '@actual-app/core/shared/months';
import type { MonthlyBudgetOverviewPeriod } from '@actual-app/core/types/models';
import i18n from 'i18next';

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
): string {
  switch (period) {
    case 'this-month':
      return i18n.t('This month');
    case 'next-month':
      return i18n.t('Next month');
    case 'last-month':
      return i18n.t('Last month');
    default:
      period satisfies never;
      return '';
  }
}
