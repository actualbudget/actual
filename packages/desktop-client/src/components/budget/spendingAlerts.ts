import * as monthUtils from '@actual-app/core/shared/months';

import { isOverspentBalance } from './util';

export type SpendingWarningTier = 'warn50' | 'warn80';
export type SpendingAlertTier = SpendingWarningTier | 'overspent';

export type SpendingWarningThreshold = {
  minPercentSpent: number;
  minDaysRemaining: number;
};

export type SpendingWarningThresholds = Record<
  SpendingWarningTier,
  SpendingWarningThreshold
>;

/**
 * Early-warning thresholds: a category is ahead of pace when it has spent
 * at least `minPercentSpent` of its budget while at least
 * `minDaysRemaining` days are left in the month. Users can change these in
 * the budget settings; these are the defaults.
 */
export const DEFAULT_SPENDING_WARNING_THRESHOLDS: SpendingWarningThresholds = {
  warn50: { minPercentSpent: 50, minDaysRemaining: 20 },
  warn80: { minPercentSpent: 80, minDaysRemaining: 10 },
};

export type SpendingWarningField = 'percent' | 'days';

/** The allowed range for each threshold setting. */
export const SPENDING_WARNING_LIMITS: Record<
  SpendingWarningField,
  { min: number; max: number }
> = {
  percent: { min: 1, max: 100 },
  // At most 30 days are left after the first day of a month
  days: { min: 0, max: 30 },
};

export function spendingWarningPrefKey(
  tier: SpendingWarningTier,
  field: SpendingWarningField,
) {
  return `spending-warning-${tier}-${field}` as const;
}

/**
 * Reads a threshold setting, falling back to the default when it is empty
 * or out of range.
 */
export function parseSpendingWarningPref(
  value: string | undefined,
  field: SpendingWarningField,
  fallback: number,
) {
  const number = Number(value);
  const { min, max } = SPENDING_WARNING_LIMITS[field];
  if (!value || !Number.isInteger(number) || number < min || number > max) {
    return fallback;
  }
  return number;
}

export type SpendingAlertInput = {
  /** The budget month, `yyyy-MM`. */
  month: string;
  /** The user's local date, `yyyy-MM-dd`. */
  today: string;
  /** The month's budgeted amount (the `budget` cell). */
  budgeted: number | null | undefined;
  /** The month's activity (the `sum-amount` cell); spending is negative. */
  sumAmount: number | null | undefined;
  /** The balance shown on the budget page (the `leftover` cell). */
  balance: number | null | undefined;
  isIncome: boolean;
  /** True when the category or its group is hidden. */
  isHidden: boolean;
};

export type SpendingAlertStatus = {
  tier: SpendingAlertTier | null;
  /** Percent of the month's available budget spent, for warning tiers. */
  percentSpent: number | null;
  /** Days left in the month after today, for warning tiers. */
  daysRemaining: number | null;
};

const NO_ALERT: SpendingAlertStatus = {
  tier: null,
  percentSpent: null,
  daysRemaining: null,
};

export function isWarningTier(
  tier: SpendingAlertTier | null | undefined,
): tier is SpendingWarningTier {
  return tier === 'warn50' || tier === 'warn80';
}

/**
 * Works out which tier a category's balance is in, which decides its
 * colour on the budget page.
 */
export function getSpendingAlertStatus(
  {
    month,
    today,
    budgeted,
    sumAmount,
    balance,
    isIncome,
    isHidden,
  }: SpendingAlertInput,
  thresholds: SpendingWarningThresholds = DEFAULT_SPENDING_WARNING_THRESHOLDS,
): SpendingAlertStatus {
  if (isIncome || isHidden) {
    return NO_ALERT;
  }

  if (isOverspentBalance(balance)) {
    return { tier: 'overspent', percentSpent: null, daysRemaining: null };
  }

  // Early warnings only make sense for the month that is under way
  if (month !== monthUtils.monthFromDate(today) || !budgeted) {
    return NO_ALERT;
  }

  // The balance counts down from the month's budget plus anything rolled
  // over from last month, so measure spending against that same total.
  const available = (balance ?? 0) - (sumAmount ?? 0);
  if (available <= 0) {
    return NO_ALERT;
  }

  const spent = Math.max(0, -(sumAmount ?? 0));
  const percentSpent = (spent / available) * 100;
  const daysRemaining = monthUtils.differenceInCalendarDays(
    monthUtils.getMonthEnd(today),
    today,
  );

  // Check the tier with the higher percentage first, so it wins when both
  // apply
  const tiers = (['warn50', 'warn80'] as const)
    .slice()
    .sort(
      (a, b) => thresholds[b].minPercentSpent - thresholds[a].minPercentSpent,
    );
  for (const tier of tiers) {
    const { minPercentSpent, minDaysRemaining } = thresholds[tier];
    if (percentSpent >= minPercentSpent && daysRemaining >= minDaysRemaining) {
      return { tier, percentSpent, daysRemaining };
    }
  }

  return NO_ALERT;
}
