// @ts-strict-ignore
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  CategoryEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';

import type { useSpreadsheet } from '#hooks/useSpreadsheet';

import type { BudgetMonthCell } from './budgetMonthCell';

type BudgetAnalysisIntervalData = {
  date: string;
  budgeted: number;
  spent: number;
  balance: number;
  overspendingAdjustment: number;
};

type BudgetAnalysisData = {
  intervalData: BudgetAnalysisIntervalData[];
  startDate: string;
  endDate: string;
  totalBudgeted: number;
  totalSpent: number;
  totalOverspendingAdjustment: number;
  finalOverspendingAdjustment: number;
};

type createBudgetAnalysisSpreadsheetProps = {
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
  startDate: string;
  endDate: string;
  showHiddenCategories?: boolean;
  budgetType?: 'envelope' | 'tracking';
};

export function isBaseCategory(
  cat: CategoryEntity,
  showHiddenCategories: boolean,
): boolean {
  return !cat.is_income && (showHiddenCategories || !cat.hidden);
}

/**
 * Last month the date pickers offer.
 *
 * The range runs through December of next year so the report can be used for
 * planning ahead, but it never cuts off existing data: if a transaction is
 * dated even further out, that month stays selectable.
 */
export function getLastSelectableMonth(
  currentMonth: string,
  latestMonth: string,
): string {
  const futureMonth = `${Number(currentMonth.slice(0, 4)) + 1}-12`;
  return latestMonth > futureMonth ? latestMonth : futureMonth;
}

export type CategoryBalanceInput = {
  balance: number;
  hasCarryover: boolean;
};

export type CategoryBalanceResult = {
  /** Amount that rolls forward into next month's opening balance. */
  carryoverToNextMonth: number;
  /** Negative amount reset this month because carryover was off (envelope mode only). */
  overspending: number;
};

/**
 * Determines how a single category's end-of-month leftover affects next
 * month's running balance.
 *
 * Envelope mode clamps a non-carried leftover to `leftover-pos` (see
 * `packages/loot-core/src/server/budget/envelope.ts`): a positive leftover
 * always carries forward, and a negative leftover only carries forward when
 * the category's carryover flag is on — otherwise it's reset to 0 and the
 * reset amount is surfaced separately (mirroring `last-month-overspent`).
 *
 * Tracking mode has no such clamp (see
 * `packages/loot-core/src/server/budget/tracking.ts`): the previous
 * leftover — positive or negative — only carries forward when the
 * category's carryover flag is on. When it's off, the leftover simply
 * resets to 0 with no separate "overspending" bucket.
 */
export function resolveCategoryBalanceCarryover(
  { balance, hasCarryover }: CategoryBalanceInput,
  budgetType: 'envelope' | 'tracking',
): CategoryBalanceResult {
  if (budgetType === 'tracking') {
    return hasCarryover
      ? { carryoverToNextMonth: balance, overspending: 0 }
      : { carryoverToNextMonth: 0, overspending: 0 };
  }

  if (balance > 0 || (balance < 0 && hasCarryover)) {
    return { carryoverToNextMonth: balance, overspending: 0 };
  }
  return { carryoverToNextMonth: 0, overspending: Math.min(0, balance) };
}

export type MonthCategoryTotals = {
  budgeted: number;
  spent: number;
  /**
   * Sum of category balances that roll into the next month, per
   * resolveCategoryBalanceCarryover.
   */
  carryoverToNextMonth: number;
  /**
   * Sum of negative balances for categories without carryover enabled. These
   * are zeroed out at the month boundary and surface as next month's
   * overspending adjustment instead of reducing the running balance.
   * Always 0 for tracking budgets (see resolveCategoryBalanceCarryover).
   */
  overspendingThisMonth: number;
  /**
   * Whether the month returned any budget data at all. Months in the future
   * that have never been budgeted come back with every cell empty; there is
   * nothing to carry over from them, so the running balance must pass through
   * untouched rather than being reset to zero.
   */
  hasBudgetData: boolean;
};

/**
 * Reduce a month's raw budget cells down to the totals the report needs.
 */
export function summarizeMonthCategories(
  monthData: BudgetMonthCell[],
  categoriesToInclude: CategoryEntity[],
  budgetType: 'envelope' | 'tracking' = 'envelope',
): MonthCategoryTotals {
  let budgeted = 0;
  let spent = 0;
  let carryoverToNextMonth = 0;
  let overspendingThisMonth = 0;
  let hasBudgetData = false;

  for (const cat of categoriesToInclude) {
    // Find the budget, spent, balance, and carryover flag for this category
    const budgetCell = monthData.find((cell: BudgetMonthCell) =>
      cell.name.endsWith(`budget-${cat.id}`),
    );
    const spentCell = monthData.find((cell: BudgetMonthCell) =>
      cell.name.endsWith(`sum-amount-${cat.id}`),
    );
    const balanceCell = monthData.find((cell: BudgetMonthCell) =>
      cell.name.endsWith(`leftover-${cat.id}`),
    );
    const carryoverCell = monthData.find((cell: BudgetMonthCell) =>
      cell.name.endsWith(`carryover-${cat.id}`),
    );

    const catBudgeted = (budgetCell?.value as number) || 0;
    const catSpent = (spentCell?.value as number) || 0;
    const catBalance = (balanceCell?.value as number) || 0;
    const hasCarryover = Boolean(carryoverCell?.value);

    // Detect by value, not by cell presence: both `envelope-budget-month`
    // and `tracking-budget-month` build their response from the category
    // list, so they emit a cell for every category in every month and fill
    // missing sheet values with 0. Every month therefore has all its cells,
    // and presence tells us nothing. A zero here is unambiguous: `leftover`
    // already folds in the previous month's balance, so a month with a real
    // balance carrying in cannot report zero across all three.
    if (catBudgeted !== 0 || catSpent !== 0 || catBalance !== 0) {
      hasBudgetData = true;
    }

    budgeted += catBudgeted;
    spent += catSpent;

    const categoryResult = resolveCategoryBalanceCarryover(
      { balance: catBalance, hasCarryover },
      budgetType,
    );
    carryoverToNextMonth += categoryResult.carryoverToNextMonth;
    overspendingThisMonth += categoryResult.overspending;
  }

  return {
    budgeted,
    spent,
    carryoverToNextMonth,
    overspendingThisMonth,
    hasBudgetData,
  };
}

/**
 * The balance that seeds the following month.
 *
 * Months with budget data hand off only what actually carries over, so
 * overspending in a category without carryover enabled is reset rather than
 * dragged forward. Months with no data at all (typically future months that
 * have never been budgeted) have nothing to carry over and must leave the
 * running balance untouched.
 */
export function getNextRunningBalance({
  hasBudgetData,
  carryoverToNextMonth,
  runningBalance,
}: {
  hasBudgetData: boolean;
  carryoverToNextMonth: number;
  runningBalance: number;
}): number {
  return hasBudgetData ? carryoverToNextMonth : runningBalance;
}

export function createBudgetAnalysisSpreadsheet({
  conditions = [],
  conditionsOp = 'and',
  startDate,
  endDate,
  showHiddenCategories = false,
  budgetType = 'envelope',
}: createBudgetAnalysisSpreadsheetProps) {
  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: BudgetAnalysisData) => void,
  ) => {
    // Get all categories
    const { list: allCategories, grouped: allCategoryGroups } =
      await send('get-categories');

    // Build a UUID → name map for category groups so text-based operators
    // (contains, doesNotContain, matches) can match against the group name.
    const groupNameById = new Map<string, string>(
      allCategoryGroups.map(
        (g: { id: string; name: string }) => [g.id, g.name] as const,
      ),
    );

    // Filter categories based on conditions (supports both 'category' and 'category_group' fields)
    const relevantConditions = conditions.filter(
      cond =>
        !cond.customName &&
        (cond.field === 'category' || cond.field === 'category_group'),
    );

    // Base set: expense categories only; hidden categories are included when
    // showHiddenCategories is true so historic data is not misrepresented.
    const baseCategories = allCategories.filter((cat: CategoryEntity) =>
      isBaseCategory(cat, showHiddenCategories),
    );

    let categoriesToInclude: CategoryEntity[];
    if (relevantConditions.length > 0) {
      // Evaluate each condition to get sets of matching categories.
      // category_group conditions are expanded to their member categories via cat.group.
      const conditionResults = relevantConditions.map(cond => {
        const getKey = (cat: CategoryEntity) =>
          cond.field === 'category_group' ? cat.group : cat.id;
        const matchesRegex =
          cond.op === 'matches' &&
          typeof cond.value === 'string' &&
          cond.value.length <= 256
            ? (() => {
                try {
                  return new RegExp(cond.value, 'i');
                } catch {
                  return null;
                }
              })()
            : null;
        return baseCategories.filter((cat: CategoryEntity) => {
          const key = getKey(cat);
          // For text-based operators, compare against the human-readable name
          // rather than the UUID. For category_group, resolve UUID → name via
          // the map; for category, use the category's own name directly.
          const textValue =
            cond.field === 'category_group'
              ? (groupNameById.get(key) ?? key)
              : cat.name;
          if (cond.op === 'is') {
            return cond.value === key;
          } else if (cond.op === 'isNot') {
            return cond.value !== key;
          } else if (cond.op === 'oneOf') {
            return Array.isArray(cond.value) && cond.value.includes(key);
          } else if (cond.op === 'notOneOf') {
            return Array.isArray(cond.value) && !cond.value.includes(key);
          } else if (cond.op === 'contains') {
            return (
              typeof cond.value === 'string' &&
              textValue.toLowerCase().includes(cond.value.toLowerCase())
            );
          } else if (cond.op === 'doesNotContain') {
            return (
              typeof cond.value === 'string' &&
              !textValue.toLowerCase().includes(cond.value.toLowerCase())
            );
          } else if (cond.op === 'matches') {
            return matchesRegex?.test(textValue) ?? false;
          }
          return false;
        });
      });

      // Combine results based on conditionsOp
      if (conditionsOp === 'or') {
        // OR: Union of all matching categories
        const categoryIds = new Set(conditionResults.flat().map(cat => cat.id));
        categoriesToInclude = baseCategories.filter(cat =>
          categoryIds.has(cat.id),
        );
      } else {
        // AND: Intersection of all matching categories
        if (conditionResults.length === 0) {
          categoriesToInclude = [];
        } else {
          const firstSet = new Set(conditionResults[0].map(cat => cat.id));
          for (let i = 1; i < conditionResults.length; i++) {
            const currentIds = new Set(conditionResults[i].map(cat => cat.id));
            // Keep only categories that are in both sets
            for (const id of firstSet) {
              if (!currentIds.has(id)) {
                firstSet.delete(id);
              }
            }
          }
          categoriesToInclude = baseCategories.filter(cat =>
            firstSet.has(cat.id),
          );
        }
      }
    } else {
      // No category or category group filter — include all expense categories
      categoriesToInclude = baseCategories;
    }

    // Get monthly intervals (Budget Analysis only supports monthly)
    const intervals = monthUtils.rangeInclusive(
      monthUtils.getMonth(startDate),
      monthUtils.getMonth(endDate),
    );

    const intervalData: BudgetAnalysisIntervalData[] = [];

    // The envelope and tracking budget types compute rollover/carryover
    // differently (see resolveCategoryBalanceCarryover), and the server
    // exposes them via different spreadsheet endpoints.
    const budgetMonthEndpoint =
      budgetType === 'tracking'
        ? 'tracking-budget-month'
        : 'envelope-budget-month';

    // Track running balance that respects carryover flags
    // Get the balance from the month before the start period to initialize properly
    const monthBeforeStart = monthUtils.subMonths(
      monthUtils.getMonth(startDate),
      1,
    );
    const prevMonthData = await send(budgetMonthEndpoint, {
      month: monthBeforeStart,
    });

    // Calculate the carryover from the previous month
    let runningBalance = summarizeMonthCategories(
      prevMonthData,
      categoriesToInclude,
      budgetType,
    ).carryoverToNextMonth;

    // Track totals across all months
    let totalBudgeted = 0;
    let totalSpent = 0;
    let totalOverspendingAdjustment = 0;

    // Track overspending from previous month to apply in next month
    let overspendingFromPrevMonth = 0;

    // Process each month
    for (const month of intervals) {
      // Get budget values from the server for this month
      // This uses the same calculations as the budget page
      const monthData = await send(budgetMonthEndpoint, { month });

      const {
        budgeted,
        spent,
        carryoverToNextMonth,
        overspendingThisMonth,
        hasBudgetData,
      } = summarizeMonthCategories(monthData, categoriesToInclude, budgetType);

      // Overspending adjustment from previous month, shown for context
      // (negative value). It is not added into `monthBalance`: overspent,
      // non-carried leftovers were already excluded from `runningBalance`
      // when they were reset, so re-applying them here would double-count.
      const overspendingAdjustment = overspendingFromPrevMonth;

      // This month's balance = budgeted + spent + running balance
      const monthBalance = budgeted + spent + runningBalance;

      // Update totals
      totalBudgeted += budgeted;
      totalSpent += spent;
      totalOverspendingAdjustment += Math.abs(overspendingAdjustment);

      intervalData.push({
        date: month,
        budgeted,
        spent,
        balance: monthBalance,
        overspendingAdjustment: Math.abs(overspendingAdjustment),
      });

      runningBalance = getNextRunningBalance({
        hasBudgetData,
        carryoverToNextMonth,
        runningBalance,
      });
      // Save this month's overspending to apply in next month
      overspendingFromPrevMonth = overspendingThisMonth;
    }

    setData({
      intervalData,
      startDate,
      endDate,
      totalBudgeted,
      totalSpent,
      totalOverspendingAdjustment,
      finalOverspendingAdjustment: overspendingFromPrevMonth,
    });
  };
}
