// @ts-strict-ignore
import { styles } from '@actual-app/components/styles';
import type { CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import {
  currencyToAmount,
  integerToCurrency,
} from '@actual-app/core/shared/util';
import type { Handlers } from '@actual-app/core/types/handlers';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';
import { t } from 'i18next';

import type { DropPosition } from '#components/sort';
import type { useSpreadsheet } from '#hooks/useSpreadsheet';

import { getValidMonthBounds } from './MonthsContext';

export function addToBeBudgetedGroup(groups: CategoryGroupEntity[]) {
  return [
    {
      id: 'to-budget',
      name: t('To Budget'),
      categories: [
        {
          id: 'to-budget',
          name: t('To Budget'),
          group: 'to-budget',
        },
      ],
    } as CategoryGroupEntity,
    ...groups,
  ];
}

export function removeCategoriesFromGroups(
  categoryGroups: CategoryGroupEntity[],
  ...categoryIds: CategoryEntity['id'][]
) {
  if (categoryIds.length === 0) return categoryGroups;

  const categoryIdsSet = new Set(categoryIds);

  return categoryGroups
    .map(group => ({
      ...group,
      categories:
        group.categories?.filter(cat => !categoryIdsSet.has(cat.id)) ?? [],
    }))
    .filter(group => group.categories?.length);
}

export function separateGroups(categoryGroups: CategoryGroupEntity[]) {
  return [
    categoryGroups.filter(g => !g.is_income),
    categoryGroups.find(g => g.is_income),
  ] as const;
}

export function makeAmountGrey(value: number | string | null): CSSProperties {
  return value === 0 || value === '0' || value === '' || value == null
    ? { color: theme.budgetNumberZero }
    : null;
}

// Converts an integer currency value to a normalized decimal amount.
// First converts the integer to currency format, then to a decimal amount.
// Uses integerToCurrency to display the value correctly according to user prefs.
function normalizeIntegerValue(val: number | null | undefined) {
  return typeof val === 'number' ? currencyToAmount(integerToCurrency(val)) : 0;
}

/**
 * Compares what a category has towards its goal with the goal, as displayed:
 * -1 when short of it, 0 when they match and 1 when over it. With hidden
 * decimals, amounts that round to the same number count as equal.
 */
export function compareToGoal(
  have: number | null | undefined,
  goalValue: number,
): -1 | 0 | 1 {
  const diff = normalizeIntegerValue(have) - normalizeIntegerValue(goalValue);
  return diff < 0 ? -1 : diff > 0 ? 1 : 0;
}

/**
 * How much of the goal is funded, as a whole percentage from 0 to 100.
 * Rounded down while underfunded so it only reads 100 once the goal is met.
 */
export function getGoalProgress(
  have: number | null | undefined,
  goalValue: number,
): number {
  if (compareToGoal(have, goalValue) >= 0) {
    return 100;
  }
  if (goalValue <= 0) {
    return 0;
  }
  const ratio = Math.max(0, (have ?? 0) / goalValue);
  return Math.min(99, Math.floor(ratio * 100));
}

/**
 * The progress to draw in the ring beside a balance, or null when no ring is
 * drawn: without a goal, when overspent (the red amount already says so) or
 * once the goal is funded (nothing left to do). Amounts compare as displayed.
 */
export function getGoalRingProgress(
  balance: number,
  goalValue: number | null | undefined,
  have: number | null | undefined,
): number | null {
  if (
    goalValue == null ||
    normalizeIntegerValue(balance) < 0 ||
    compareToGoal(have, goalValue) >= 0
  ) {
    return null;
  }
  return getGoalProgress(have, goalValue);
}

export function makeBalanceAmountStyle(value: number) {
  const amount = normalizeIntegerValue(value);
  if (amount < 0) {
    return { color: theme.budgetNumberNegative };
  }
  return makeAmountGrey(amount) ?? { color: theme.budgetNumberPositive };
}

export function makeAmountFullStyle(
  value: number,
  colors?: {
    positiveColor?: string;
    negativeColor?: string;
    zeroColor?: string;
  },
) {
  const positiveColorToUse =
    colors?.positiveColor || theme.budgetNumberPositive;
  const negativeColorToUse =
    colors?.negativeColor || theme.budgetNumberNegative;
  const zeroColorToUse = colors?.zeroColor || theme.budgetNumberZero;
  return {
    color:
      value < 0
        ? negativeColorToUse
        : value === 0
          ? zeroColorToUse
          : positiveColorToUse,
  };
}

export function findSortDown<T extends { id: string }>(
  arr: T[],
  pos: DropPosition | null,
  targetId: string,
) {
  if (pos === 'top') {
    return { targetId };
  } else {
    const idx = arr.findIndex(item => item.id === targetId);

    if (idx === -1) {
      throw new Error('findSort: item not found: ' + targetId);
    }

    const newIdx = idx + 1;
    if (newIdx < arr.length) {
      return { targetId: arr[newIdx].id };
    } else {
      // Move to the end
      return { targetId: null };
    }
  }
}

export function findSortUp<T extends { id: string }>(
  arr: T[],
  pos: DropPosition | null,
  targetId: string,
) {
  if (pos === 'bottom') {
    return { targetId };
  } else {
    const idx = arr.findIndex(item => item.id === targetId);

    if (idx === -1) {
      throw new Error('findSort: item not found: ' + targetId);
    }

    const newIdx = idx - 1;
    if (newIdx >= 0) {
      return { targetId: arr[newIdx].id };
    } else {
      // Move to the beginning
      return { targetId: null };
    }
  }
}

export function getScrollbarWidth() {
  return Math.max(styles.scrollbarWidth - 2, 0);
}

export async function prewarmMonth(
  budgetType: SyncedPrefs['budgetType'],
  spreadsheet: ReturnType<typeof useSpreadsheet>,
  month: string,
) {
  const method: keyof Handlers =
    budgetType === 'tracking'
      ? 'tracking-budget-month'
      : 'envelope-budget-month';

  const values = await send(method, { month });

  for (const value of values) {
    spreadsheet.prewarmCache(value.name, value);
  }
}

export async function prewarmAllMonths(
  budgetType: SyncedPrefs['budgetType'],
  spreadsheet: ReturnType<typeof useSpreadsheet>,
  bounds: { start: string; end: string },
  startMonth: string,
) {
  const numMonths = 3;

  bounds = getValidMonthBounds(
    bounds,
    monthUtils.subMonths(startMonth, 1),
    monthUtils.addMonths(startMonth, numMonths + 1),
  );
  const months = monthUtils.rangeInclusive(bounds.start, bounds.end);

  await Promise.all(
    months.map(month => prewarmMonth(budgetType, spreadsheet, month)),
  );
}
