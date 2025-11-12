// @ts-strict-ignore
import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import { type RuleConditionEntity } from 'loot-core/types/models';

import { makeQuery } from './makeQuery';

import { type useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';

type BudgetAnalysisMonthData = {
  month: string;
  budgeted: number;
  spent: number;
  balance: number;
};

type BudgetAnalysisData = {
  monthData: BudgetAnalysisMonthData[];
  startDate: string;
  endDate: string;
};

type createBudgetAnalysisSpreadsheetProps = {
  conditions?: RuleConditionEntity[];
  conditionsOp?: string;
  startDate: string;
  endDate: string;
};

export function createBudgetAnalysisSpreadsheet({
  conditions = [],
  conditionsOp,
  startDate,
  endDate,
}: createBudgetAnalysisSpreadsheetProps) {
  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: BudgetAnalysisData) => void,
  ) => {
    const { filters } = await send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    });

    const { filters: budgetFilters } = await send(
      'make-filters-from-conditions',
      {
        conditions: conditions.filter(
          cond => !cond.customName && cond.field === 'category',
        ),
        applySpecialCases: false,
      },
    );

    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    // Get all months in the range
    const months = monthUtils.rangeInclusive(
      monthUtils.getMonth(startDate),
      monthUtils.getMonth(endDate),
    );

    const monthData: BudgetAnalysisMonthData[] = [];
    let carryoverBalance = 0;

    // Process each month
    for (const month of months) {
      const monthStart = month + '-01';
      const monthEnd = monthUtils.getMonthEnd(monthStart);
      const budgetMonth = parseInt(month.replace('-', ''));

      // Get budgeted amount for this month
      const [budgets] = await Promise.all([
        aqlQuery(
          q('zero_budgets')
            .filter({
              $and: [{ month: { $eq: budgetMonth } }],
            })
            .filter({
              [conditionsOpKey]: budgetFilters,
            })
            .groupBy([{ $id: '$category' }])
            .select([
              { category: { $id: '$category' } },
              { amount: { $sum: '$amount' } },
            ]),
        ).then(({ data }) => data),
      ]);

      const budgeted =
        budgets && budgets.length > 0
          ? budgets.reduce((a, v) => a + v.amount, 0)
          : 0;

      // Get spending for this month using the same logic as spending analysis
      const [assets, debts] = await Promise.all([
        aqlQuery(
          makeQuery(
            'assets',
            monthStart,
            monthEnd,
            'Monthly',
            conditionsOpKey,
            filters,
          ),
        ).then(({ data }) => data),
        aqlQuery(
          makeQuery(
            'debts',
            monthStart,
            monthEnd,
            'Monthly',
            conditionsOpKey,
            filters,
          ),
        ).then(({ data }) => data),
      ]);

      const spent =
        assets
          .filter(e => !e.categoryIncome && !e.accountOffBudget)
          .reduce((a, v) => a + v.amount, 0) +
        debts
          .filter(e => !e.categoryIncome && !e.accountOffBudget)
          .reduce((a, v) => a + v.amount, 0);

      // Calculate balance: previous balance + budgeted - spent
      const balance = carryoverBalance + budgeted + spent; // spent is negative, so we add it

      monthData.push({
        month,
        budgeted,
        spent: Math.abs(spent),
        balance,
      });

      // Carry over balance to next month
      carryoverBalance = balance;
    }

    setData({
      monthData,
      startDate,
      endDate,
    });
  };
}
