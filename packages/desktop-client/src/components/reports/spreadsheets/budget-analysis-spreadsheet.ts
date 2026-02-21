// @ts-strict-ignore
import { send } from 'loot-core/platform/client/connection';
import * as monthUtils from 'loot-core/shared/months';
import type {
  CategoryEntity,
  RuleConditionEntity,
} from 'loot-core/types/models';

import type { useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';

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
};

export function createBudgetAnalysisSpreadsheet({
  conditions = [],
  conditionsOp = 'and',
  startDate,
  endDate,
}: createBudgetAnalysisSpreadsheetProps) {
  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: BudgetAnalysisData) => void,
  ) => {
    // Get all categories
    const { list: allCategories } = await send('get-categories');

    // Filter categories based on conditions
    const categoryConditions = conditions.filter(
      cond => !cond.customName && cond.field === 'category',
    );

    // Base set: expense categories only (exclude income and hidden)
    const baseCategories = allCategories.filter(
      (cat: CategoryEntity) => !cat.is_income && !cat.hidden,
    );

    let categoriesToInclude: CategoryEntity[];
    if (categoryConditions.length > 0) {
      // Evaluate each condition to get sets of matching categories
      const conditionResults = categoryConditions.map(cond => {
        return baseCategories.filter((cat: CategoryEntity) => {
          if (cond.op === 'is') {
            return cond.value === cat.id;
          } else if (cond.op === 'isNot') {
            return cond.value !== cat.id;
          } else if (cond.op === 'oneOf') {
            return cond.value.includes(cat.id);
          } else if (cond.op === 'notOneOf') {
            return !cond.value.includes(cat.id);
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
      // No category filter, use all expense categories
      categoriesToInclude = baseCategories;
    }

    // Get monthly intervals (Budget Analysis only supports monthly)
    const intervals = monthUtils.rangeInclusive(
      monthUtils.getMonth(startDate),
      monthUtils.getMonth(endDate),
    );

    const intervalData: BudgetAnalysisIntervalData[] = [];

    // Track running balance that respects carryover flags
    // Get the balance from the month before the start period to initialize properly
    let runningBalance = 0;
    const monthBeforeStart = monthUtils.subMonths(
      monthUtils.getMonth(startDate),
      1,
    );
    const prevMonthData = await send('envelope-budget-month', {
      month: monthBeforeStart,
    });

    // Calculate the carryover from the previous month
    for (const cat of categoriesToInclude) {
      const balanceCell = prevMonthData.find((cell: { name: string }) =>
        cell.name.endsWith(`leftover-${cat.id}`),
      );
      const carryoverCell = prevMonthData.find((cell: { name: string }) =>
        cell.name.endsWith(`carryover-${cat.id}`),
      );

      const catBalance = (balanceCell?.value as number) || 0;
      const hasCarryover = Boolean(carryoverCell?.value);

      // Add to running balance if it would carry over
      if (catBalance > 0 || (catBalance < 0 && hasCarryover)) {
        runningBalance += catBalance;
      }
    }

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
      const monthData = await send('envelope-budget-month', { month });

      let budgeted = 0;
      let spent = 0;
      let overspendingThisMonth = 0;

      // Track what will carry over to next month
      let carryoverToNextMonth = 0;

      // Sum up values for categories we're interested in
      for (const cat of categoriesToInclude) {
        // Find the budget, spent, balance, and carryover flag for this category
        const budgetCell = monthData.find((cell: { name: string }) =>
          cell.name.endsWith(`budget-${cat.id}`),
        );
        const spentCell = monthData.find((cell: { name: string }) =>
          cell.name.endsWith(`sum-amount-${cat.id}`),
        );
        const balanceCell = monthData.find((cell: { name: string }) =>
          cell.name.endsWith(`leftover-${cat.id}`),
        );
        const carryoverCell = monthData.find((cell: { name: string }) =>
          cell.name.endsWith(`carryover-${cat.id}`),
        );

        const catBudgeted = (budgetCell?.value as number) || 0;
        const catSpent = (spentCell?.value as number) || 0;
        const catBalance = (balanceCell?.value as number) || 0;
        const hasCarryover = Boolean(carryoverCell?.value);

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

      // Apply overspending adjustment from previous month (negative value)
      const overspendingAdjustment = overspendingFromPrevMonth;

      // This month's balance = budgeted + spent + running balance + overspending adjustment
      const monthBalance = budgeted + spent + runningBalance;

      // Update totals
      totalBudgeted += budgeted;
      totalSpent += spent;
      totalOverspendingAdjustment += Math.abs(overspendingAdjustment);

      intervalData.push({
        date: month,
        budgeted,
        spent, // Display as positive
        balance: monthBalance,
        overspendingAdjustment: Math.abs(overspendingAdjustment), // Display as positive
      });

      // Update running balance for next month
      runningBalance = carryoverToNextMonth;
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
