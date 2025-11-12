// @ts-strict-ignore
import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import { type RuleConditionEntity } from 'loot-core/types/models';

import { makeQuery } from './makeQuery';

import { type useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';

type BudgetAnalysisIntervalData = {
  date: string;
  budgeted: number;
  spent: number;
  balance: number;
};

type BudgetAnalysisData = {
  intervalData: BudgetAnalysisIntervalData[];
  startDate: string;
  endDate: string;
};

type createBudgetAnalysisSpreadsheetProps = {
  conditions?: RuleConditionEntity[];
  conditionsOp?: string;
  startDate: string;
  endDate: string;
  interval?: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  firstDayOfWeekIdx?: string;
};

export function createBudgetAnalysisSpreadsheet({
  conditions = [],
  conditionsOp,
  startDate,
  endDate,
  interval = 'Monthly',
  firstDayOfWeekIdx = '0',
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

    // Get intervals based on interval type
    let intervals: string[];
    if (interval === 'Daily') {
      intervals = monthUtils.dayRangeInclusive(startDate, endDate);
    } else if (interval === 'Weekly') {
      const startWeek = monthUtils.weekFromDate(startDate, firstDayOfWeekIdx);
      const endWeek = monthUtils.weekFromDate(endDate, firstDayOfWeekIdx);
      intervals = monthUtils.weekRangeInclusive(
        startWeek,
        endWeek,
        firstDayOfWeekIdx,
      );
    } else if (interval === 'Yearly') {
      const startYear = monthUtils.yearFromDate(startDate);
      const endYear = monthUtils.yearFromDate(endDate);
      intervals = monthUtils.yearRangeInclusive(startYear, endYear);
    } else {
      // Monthly
      intervals = monthUtils.rangeInclusive(
        monthUtils.getMonth(startDate),
        monthUtils.getMonth(endDate),
      );
    }

    const intervalData: BudgetAnalysisIntervalData[] = [];
    let carryoverBalance = 0;

    // Process each interval
    for (const intervalItem of intervals) {
      let intervalStart: string;
      let intervalEnd: string;
      let budgetMonth: number;

      if (interval === 'Daily') {
        intervalStart = intervalItem;
        intervalEnd = intervalItem;
        budgetMonth = parseInt(
          monthUtils.getMonth(intervalItem).replace('-', ''),
        );
      } else if (interval === 'Weekly') {
        intervalStart = intervalItem;
        intervalEnd = monthUtils.weekEndDate(intervalItem, firstDayOfWeekIdx);
        budgetMonth = parseInt(
          monthUtils.getMonth(intervalStart).replace('-', ''),
        );
      } else if (interval === 'Yearly') {
        intervalStart = intervalItem + '-01-01';
        intervalEnd = intervalItem + '-12-31';
        budgetMonth = parseInt(intervalItem + '01'); // January of that year
      } else {
        // Monthly
        intervalStart = intervalItem + '-01';
        intervalEnd = monthUtils.getMonthEnd(intervalStart);
        budgetMonth = parseInt(intervalItem.replace('-', ''));
      }

      // Get budgeted amount
      let budgeted = 0;
      if (interval === 'Daily' || interval === 'Weekly') {
        // For daily/weekly, we need to amortize the monthly budget
        const monthStart = monthUtils.getMonth(intervalStart) + '-01';
        const monthEnd = monthUtils.getMonthEnd(monthStart);
        const daysInMonth = monthUtils
          .dayRangeInclusive(monthStart, monthEnd)
          .length;

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

        const monthlyBudget =
          budgets && budgets.length > 0
            ? budgets.reduce((a, v) => a + v.amount, 0)
            : 0;

        // Amortize across the month
        if (interval === 'Daily') {
          budgeted = Math.round(monthlyBudget / daysInMonth);
        } else {
          // Weekly - calculate days in this week that are in this month
          const weekDays = monthUtils.dayRangeInclusive(
            intervalStart,
            intervalEnd,
          );
          const daysInThisMonth = weekDays.filter(
            day => monthUtils.getMonth(day) === monthUtils.getMonth(intervalStart),
          ).length;
          budgeted = Math.round((monthlyBudget / daysInMonth) * daysInThisMonth);
        }
      } else if (interval === 'Yearly') {
        // For yearly, sum all months in that year
        const months = monthUtils.rangeInclusive(
          intervalItem + '-01',
          intervalItem + '-12',
        );
        for (const month of months) {
          const monthBudget = parseInt(month.replace('-', ''));
          const [budgets] = await Promise.all([
            aqlQuery(
              q('zero_budgets')
                .filter({
                  $and: [{ month: { $eq: monthBudget } }],
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

          const monthlyBudget =
            budgets && budgets.length > 0
              ? budgets.reduce((a, v) => a + v.amount, 0)
              : 0;
          budgeted += monthlyBudget;
        }
      } else {
        // Monthly
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

        budgeted =
          budgets && budgets.length > 0
            ? budgets.reduce((a, v) => a + v.amount, 0)
            : 0;
      }

      // Get spending for this interval
      const [assets, debts] = await Promise.all([
        aqlQuery(
          makeQuery(
            'assets',
            intervalStart,
            intervalEnd,
            interval,
            conditionsOpKey,
            filters,
          ),
        ).then(({ data }) => data),
        aqlQuery(
          makeQuery(
            'debts',
            intervalStart,
            intervalEnd,
            interval,
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

      intervalData.push({
        date: intervalItem,
        budgeted,
        spent: Math.abs(spent),
        balance,
      });

      // Carry over balance to next interval
      carryoverBalance = balance;
    }

    setData({
      intervalData,
      startDate,
      endDate,
    });
  };
}
