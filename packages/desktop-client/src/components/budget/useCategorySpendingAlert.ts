import * as monthUtils from '@actual-app/core/shared/months';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';

import { useSheetValue } from '#hooks/useSheetValue';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { envelopeBudget, trackingBudget } from '#spreadsheet/bindings';

import {
  DEFAULT_SPENDING_WARNING_THRESHOLDS,
  getSpendingAlertStatus,
  parseSpendingWarningPref,
  spendingWarningPrefKey,
} from './spendingAlerts';
import type { SpendingWarningThresholds } from './spendingAlerts';

type BudgetSheet = 'envelope-budget' | 'tracking-budget';

type UseCategorySpendingAlertProps = {
  budgetType: 'envelope' | 'tracking';
  month: string;
  category: CategoryEntity;
  categoryGroup?: CategoryGroupEntity;
};

/**
 * The spending alert tier of one category in one month, for styling its
 * balance. Must be used inside the month's sheet.
 */
export function useCategorySpendingAlert({
  budgetType,
  month,
  category,
  categoryGroup,
}: UseCategorySpendingAlertProps) {
  const isTracking = budgetType === 'tracking';
  const budgetedBinding = isTracking
    ? trackingBudget.catBudgeted(category.id)
    : envelopeBudget.catBudgeted(category.id);
  const sumAmountBinding = isTracking
    ? trackingBudget.catSumAmount(category.id)
    : envelopeBudget.catSumAmount(category.id);
  const balanceBinding = isTracking
    ? trackingBudget.catBalance(category.id)
    : envelopeBudget.catBalance(category.id);
  const budgeted = useSheetValue<BudgetSheet, typeof budgetedBinding>(
    budgetedBinding,
  );
  const sumAmount = useSheetValue<BudgetSheet, typeof sumAmountBinding>(
    sumAmountBinding,
  );
  const balance = useSheetValue<BudgetSheet, typeof balanceBinding>(
    balanceBinding,
  );

  const thresholds = useSpendingWarningThresholds();

  return getSpendingAlertStatus(
    {
      month,
      today: monthUtils.currentDay(),
      budgeted,
      sumAmount,
      balance,
      isIncome: !!category.is_income,
      isHidden: !!category.hidden || !!categoryGroup?.hidden,
    },
    thresholds,
  );
}

/** The early-warning thresholds from the budget settings. */
export function useSpendingWarningThresholds(): SpendingWarningThresholds {
  const [warn50Percent] = useSyncedPref(
    spendingWarningPrefKey('warn50', 'percent'),
  );
  const [warn50Days] = useSyncedPref(spendingWarningPrefKey('warn50', 'days'));
  const [warn80Percent] = useSyncedPref(
    spendingWarningPrefKey('warn80', 'percent'),
  );
  const [warn80Days] = useSyncedPref(spendingWarningPrefKey('warn80', 'days'));
  const defaults = DEFAULT_SPENDING_WARNING_THRESHOLDS;

  return {
    warn50: {
      minPercentSpent: parseSpendingWarningPref(
        warn50Percent,
        'percent',
        defaults.warn50.minPercentSpent,
      ),
      minDaysRemaining: parseSpendingWarningPref(
        warn50Days,
        'days',
        defaults.warn50.minDaysRemaining,
      ),
    },
    warn80: {
      minPercentSpent: parseSpendingWarningPref(
        warn80Percent,
        'percent',
        defaults.warn80.minPercentSpent,
      ),
      minDaysRemaining: parseSpendingWarningPref(
        warn80Days,
        'days',
        defaults.warn80.minDaysRemaining,
      ),
    },
  };
}
