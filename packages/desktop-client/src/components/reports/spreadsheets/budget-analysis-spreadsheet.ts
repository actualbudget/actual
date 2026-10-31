// @ts-strict-ignore
import { send } from '@actual-app/core/platform/client/connection';
import type { PocketIncompleteReason } from '@actual-app/core/server/budget/reservations';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  CategoryEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';

import type { useSpreadsheet } from '#hooks/useSpreadsheet';

import { addKnown, categoryPockets } from './budgetMonthCell';
import type { BudgetMonthCell } from './budgetMonthCell';

/**
 * Amounts are null when unknown. Categories with currency pockets add an
 * FX contribution and the reasons for unknown amounts.
 */
export type BudgetAnalysisIntervalData = {
  date: string;
  budgeted: number | null;
  spent: number | null;
  balance: number | null;
  overspendingAdjustment: number | null;
  fxContribution?: number | null;
  incomplete?: PocketIncompleteReason[];
};

type BudgetAnalysisData = {
  intervalData: BudgetAnalysisIntervalData[];
  startDate: string;
  endDate: string;
  totalBudgeted: number | null;
  totalSpent: number | null;
  totalOverspendingAdjustment: number | null;
  finalOverspendingAdjustment: number;
};

type createBudgetAnalysisSpreadsheetProps = {
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
  startDate: string;
  endDate: string;
  showHiddenCategories?: boolean;
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
   * Sum of category balances that roll into the next month: positive balances
   * always roll over, negative ones only when the category has carryover
   * ("rollover overspending") enabled.
   */
  carryoverToNextMonth: number;
  /**
   * Sum of negative balances for categories without carryover enabled. These
   * are zeroed out at the month boundary and surface as next month's
   * overspending adjustment instead of reducing the running balance.
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

    // Detect by value, not by cell presence: `envelope-budget-month` builds
    // its response from the category list, so it emits a cell for every
    // category in every month and fills missing sheet values with 0. Every
    // month therefore has all its cells, and presence tells us nothing.
    // A zero here is unambiguous: `leftover` already folds in the previous
    // month's balance, so a month with a real balance carrying in cannot
    // report zero across all three.
    if (catBudgeted !== 0 || catSpent !== 0 || catBalance !== 0) {
      hasBudgetData = true;
    }

    budgeted += catBudgeted;
    spent += catSpent;

    // Add to next month's carryover if:
    // - Balance is positive (always carries over), OR
    // - Balance is negative AND carryover is enabled
    if (catBalance > 0 || (catBalance < 0 && hasCarryover)) {
      carryoverToNextMonth += catBalance;
    } else if (catBalance < 0 && !hasCarryover) {
      // If balance is negative and carryover is NOT enabled,
      // this will be zeroed out and becomes next month's overspending adjustment
      overspendingThisMonth += catBalance; // Keep as negative
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

/** A pocket category's last recorded balance, null with its reasons. */
type PocketBalance = {
  balance: number | null;
  incomplete: PocketIncompleteReason[];
};

/**
 * Categories with currency pockets report their own valued balance, reset
 * and FX contribution, so they are summed rather than reconstructed. A month
 * without a category's entry passes its last balance through.
 */
export function summarizePocketCategories(
  monthData: BudgetMonthCell[],
  categoryIds: string[],
  lastBalances: Map<string, PocketBalance>,
) {
  let budgeted: number | null = 0;
  let spent: number | null = 0;
  let fxContribution: number | null = 0;
  let balance: number | null = 0;
  let reset: number | null = 0;
  let hasBudgetData = false;
  const incomplete = new Set<PocketIncompleteReason>();
  for (const id of categoryIds) {
    const pockets = categoryPockets(monthData, id);
    if (!pockets) {
      // A recorded unknown stays unknown, with its reasons.
      const last = lastBalances.get(id);
      balance = addKnown(balance, last ? last.balance : 0);
      if (last?.balance === null) {
        for (const reason of last.incomplete) incomplete.add(reason);
      }
      continue;
    }
    hasBudgetData ||= [pockets.budgeted, pockets.spent, pockets.balance].some(
      value => value !== 0,
    );
    budgeted = addKnown(budgeted, pockets.budgeted);
    spent = addKnown(spent, pockets.spent);
    fxContribution = addKnown(fxContribution, pockets.fxContribution);
    balance = addKnown(balance, pockets.balance);
    reset = addKnown(reset, pockets.reset);
    lastBalances.set(id, {
      balance: pockets.balance,
      incomplete: pockets.incomplete,
    });
    for (const reason of pockets.incomplete) incomplete.add(reason);
  }
  return {
    budgeted,
    spent,
    fxContribution,
    balance,
    reset,
    hasBudgetData,
    incomplete: [...incomplete],
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

    // Get the balance from the month before the start period to initialize properly
    const monthBeforeStart = monthUtils.subMonths(
      monthUtils.getMonth(startDate),
      1,
    );
    const prevMonthData = await send('envelope-budget-month', {
      month: monthBeforeStart,
    });
    // This uses the same calculations as the budget page
    const monthsData: BudgetMonthCell[][] = [];
    for (const month of intervals) {
      monthsData.push(await send('envelope-budget-month', { month }));
    }

    // Categories with currency pockets in the range report their own
    // balances; the others are reconstructed from their cells.
    const pocketIds = categoriesToInclude
      .filter(cat =>
        [prevMonthData, ...monthsData].some(data =>
          categoryPockets(data, cat.id),
        ),
      )
      .map(cat => cat.id);
    const ordinary = categoriesToInclude.filter(
      cat => !pocketIds.includes(cat.id),
    );
    const lastBalances = new Map<string, PocketBalance>();
    summarizePocketCategories(prevMonthData, pocketIds, lastBalances);

    // Track running balance that respects carryover flags
    let runningBalance = summarizeMonthCategories(
      prevMonthData,
      ordinary,
    ).carryoverToNextMonth;

    // Track totals across all months
    let totalBudgeted: number | null = 0;
    let totalSpent: number | null = 0;
    let totalOverspendingAdjustment: number | null = 0;

    // Track overspending from previous month to apply in next month
    let overspendingFromPrevMonth = 0;

    // Process each month
    intervals.forEach((month, index) => {
      const monthData = monthsData[index];
      const summary = summarizeMonthCategories(monthData, ordinary);
      const pockets =
        pocketIds.length > 0
          ? summarizePocketCategories(monthData, pocketIds, lastBalances)
          : null;

      // Overspending reset from the previous month (negative value); a
      // pocket category reports its own reset.
      const overspendingAdjustment = addKnown(
        overspendingFromPrevMonth,
        pockets ? pockets.reset : 0,
      );
      const adjustment =
        overspendingAdjustment === null
          ? null
          : Math.abs(overspendingAdjustment);
      const budgeted = addKnown(
        summary.budgeted,
        pockets ? pockets.budgeted : 0,
      );
      const spent = addKnown(summary.spent, pockets ? pockets.spent : 0);

      // This month's balance = budgeted + spent + running balance + overspending adjustment
      const monthBalance = addKnown(
        summary.budgeted + summary.spent + runningBalance,
        pockets ? pockets.balance : 0,
      );

      // Update totals
      totalBudgeted = addKnown(totalBudgeted, budgeted);
      totalSpent = addKnown(totalSpent, spent);
      totalOverspendingAdjustment = addKnown(
        totalOverspendingAdjustment,
        adjustment,
      );

      intervalData.push({
        date: month,
        budgeted,
        spent,
        balance: monthBalance,
        overspendingAdjustment: adjustment,
        ...(pockets && {
          fxContribution: pockets.fxContribution,
          incomplete: pockets.incomplete,
        }),
      });

      runningBalance = getNextRunningBalance({
        hasBudgetData: summary.hasBudgetData || !!pockets?.hasBudgetData,
        carryoverToNextMonth: summary.carryoverToNextMonth,
        runningBalance,
      });
      // Save this month's overspending to apply in next month
      overspendingFromPrevMonth = summary.overspendingThisMonth;
    });

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
