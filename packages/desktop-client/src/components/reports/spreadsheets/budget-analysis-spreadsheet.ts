// @ts-strict-ignore
import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import {
  type CategoryEntity,
  type RuleConditionEntity,
} from 'loot-core/types/models';

import { type useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';

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
};

type createBudgetAnalysisSpreadsheetProps = {
  conditions?: RuleConditionEntity[];
  startDate: string;
  endDate: string;
};

export function createBudgetAnalysisSpreadsheet({
  conditions = [],
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

    let categoriesToInclude: CategoryEntity[];
    if (categoryConditions.length > 0) {
      // Apply the filter conditions to determine which categories to include
      categoriesToInclude = allCategories.filter((cat: CategoryEntity) => {
        return categoryConditions.every(cond => {
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
    } else {
      // No category filter, get all expense categories (exclude income)
      categoriesToInclude = allCategories.filter(
        (cat: CategoryEntity) => !cat.is_income && !cat.hidden,
      );
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

    // Process each month
    for (const month of intervals) {
      // Get budget values from the server for this month
      // This uses the same calculations as the budget page
      const monthData = await send('envelope-budget-month', { month });

      let budgeted = 0;
      let spent = 0;
      let overspendingAdjustment = 0;

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
          // this is an overspending adjustment (balance is zeroed out)
          overspendingAdjustment += Math.abs(catBalance);
        }
      }

      // This month's balance = budgeted + spent + running balance from previous month
      const monthBalance = budgeted + spent + runningBalance;

      // Update totals
      totalBudgeted += budgeted;
      totalSpent += Math.abs(spent);
      totalOverspendingAdjustment += overspendingAdjustment;

      intervalData.push({
        date: month,
        budgeted,
        spent: Math.abs(spent), // Display as positive
        balance: monthBalance,
        overspendingAdjustment,
      });

      // Update running balance for next month
      runningBalance = carryoverToNextMonth;
    }

    setData({
      intervalData,
      startDate,
      endDate,
      totalBudgeted,
      totalSpent,
      totalOverspendingAdjustment,
    });
  };
}
