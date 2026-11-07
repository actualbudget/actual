// @ts-strict-ignore
import { send } from '@actual-app/core/platform/client/connection';
import type { BudgetType } from '@actual-app/core/server/prefs';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  CategoryEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';

import type { useSpreadsheet } from '#hooks/useSpreadsheet';

import type { BudgetMonthCell } from './budgetMonthCell';

export type BudgetAnalysisIntervalData = {
  date: string;
  budgeted: number;
  spent: number;
  balance: number;
  overspendingAdjustment: number;
  /** Budgeted plus spent for this month alone, ignoring any carryover. */
  variance: number;
  /** Sum of `variance` from the start of the period through this month. */
  cumulativeVariance: number;
};

type BudgetAnalysisData = {
  budgetType: BudgetType;
  intervalData: BudgetAnalysisIntervalData[];
  totalBudgeted: number;
  totalSpent: number;
  totalVariance: number;
  totalOverspendingAdjustment: number;
};

type createBudgetAnalysisSpreadsheetProps = {
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
  startDate: string;
  endDate: string;
  showHiddenCategories?: boolean;
  budgetType: BudgetType;
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

export type MonthCategoryTotals = {
  budgeted: number;
  spent: number;
  /**
   * Sum of category balances that roll into the next month. On envelope
   * budgets positive balances always roll over and negative ones only with
   * rollover overspending enabled. On tracking budgets any balance only rolls
   * over with carryover enabled.
   */
  carryoverToNextMonth: number;
  /**
   * Sum of negative balances for envelope categories without carryover
   * enabled. These surface as next month's overspending adjustment. Always 0
   * on tracking budgets, which have no such adjustment.
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
  budgetType: BudgetType,
): MonthCategoryTotals {
  // Cell names look like `budget202601!leftover-<category id>`
  const cellValues = new Map(
    monthData.map(cell => [
      cell.name.slice(cell.name.indexOf('!') + 1),
      cell.value,
    ]),
  );

  let budgeted = 0;
  let spent = 0;
  let carryoverToNextMonth = 0;
  let overspendingThisMonth = 0;
  let hasBudgetData = false;

  for (const cat of categoriesToInclude) {
    const catBudgeted = (cellValues.get(`budget-${cat.id}`) as number) || 0;
    const catSpent = (cellValues.get(`sum-amount-${cat.id}`) as number) || 0;
    const catBalance = (cellValues.get(`leftover-${cat.id}`) as number) || 0;
    const hasCarryover = Boolean(cellValues.get(`carryover-${cat.id}`));

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

    if (hasCarryover || (budgetType === 'envelope' && catBalance > 0)) {
      carryoverToNextMonth += catBalance;
    } else if (budgetType === 'envelope') {
      overspendingThisMonth += catBalance;
    }
  }

  return {
    budgeted,
    spent,
    carryoverToNextMonth,
    overspendingThisMonth,
    hasBudgetData,
  };
}

export function calculateBudgetAnalysis({
  budgetType,
  previousMonth,
  months,
}: {
  budgetType: BudgetType;
  previousMonth: MonthCategoryTotals;
  months: Array<MonthCategoryTotals & { date: string }>;
}): BudgetAnalysisData {
  const intervalData: BudgetAnalysisIntervalData[] = [];

  let totalBudgeted = 0;
  let totalSpent = 0;
  let totalOverspendingAdjustment = 0;

  // Seed the balance with what carries in from before the period
  let runningBalance = previousMonth.carryoverToNextMonth;

  // Track overspending from previous month to apply in next month
  let overspendingFromPrevMonth = 0;

  for (const {
    date,
    budgeted,
    spent,
    carryoverToNextMonth,
    overspendingThisMonth,
    hasBudgetData,
  } of months) {
    const overspendingAdjustment = Math.abs(overspendingFromPrevMonth);

    totalBudgeted += budgeted;
    totalSpent += spent;
    totalOverspendingAdjustment += overspendingAdjustment;

    intervalData.push({
      date,
      budgeted,
      spent,
      // Overspent, non-carried leftovers were already excluded from
      // `runningBalance` when they were reset, so the adjustment is shown for
      // context only and not added here.
      balance: budgeted + spent + runningBalance,
      overspendingAdjustment,
      variance: budgeted + spent,
      cumulativeVariance: totalBudgeted + totalSpent,
    });

    // Months with no data have nothing to carry over, so the running balance
    // passes through them untouched.
    if (hasBudgetData) {
      runningBalance = carryoverToNextMonth;
    }
    overspendingFromPrevMonth = overspendingThisMonth;
  }

  return {
    budgetType,
    intervalData,
    totalBudgeted,
    totalSpent,
    totalVariance: totalBudgeted + totalSpent,
    totalOverspendingAdjustment,
  };
}

export function createBudgetAnalysisSpreadsheet({
  conditions = [],
  conditionsOp = 'and',
  startDate,
  endDate,
  showHiddenCategories = false,
  budgetType,
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

    const budgetMonthEndpoint =
      budgetType === 'tracking'
        ? 'tracking-budget-month'
        : 'envelope-budget-month';

    // Fetch one month at a time and keep only its totals, so a long period
    // neither floods the backend nor holds every month's cells in memory.
    async function fetchMonthTotals(month: string) {
      return summarizeMonthCategories(
        await send(budgetMonthEndpoint, { month }),
        categoriesToInclude,
        budgetType,
      );
    }

    const previousMonth = await fetchMonthTotals(
      monthUtils.subMonths(monthUtils.getMonth(startDate), 1),
    );

    const months: Array<MonthCategoryTotals & { date: string }> = [];
    for (const date of intervals) {
      months.push({ date, ...(await fetchMonthTotals(date)) });
    }

    setData(calculateBudgetAnalysis({ budgetType, previousMonth, months }));
  };
}
