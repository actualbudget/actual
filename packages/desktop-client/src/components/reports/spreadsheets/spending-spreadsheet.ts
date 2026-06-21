import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type {
  CategoryEntity,
  CategoryGroupEntity,
  RuleConditionEntity,
  SpendingAverageRange,
  SpendingEntity,
  SpendingMonthEntity,
} from '@actual-app/core/types/models';
// @ts-strict-ignore
import keyBy from 'lodash/keyBy';

import { resolveSpendingAverageRange } from '#components/reports/spendingAverageRange';
import { fromDateRepr } from '#components/reports/util';
import type { useSpreadsheet } from '#hooks/useSpreadsheet';
import { aqlQuery } from '#queries/aqlQuery';

import {
  filterCategoriesByConditions,
  isSupportedCategoryCondition,
} from './budgetDataQuery';
import { makeQuery } from './makeQuery';

type createSpendingSpreadsheetProps = {
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
  compare?: string;
  compareTo?: string;
  averageRange?: SpendingAverageRange;
  budgetType?: 'envelope' | 'tracking';
};

export function getSpendingBudgetFilters({
  categories,
  categoryGroups,
  conditions,
  conditionsOp,
}: {
  categories: CategoryEntity[];
  categoryGroups: CategoryGroupEntity[];
  conditions: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
}) {
  const budgetConditions = conditions.filter(
    cond =>
      !cond.customName &&
      (cond.field === 'category' || cond.field === 'category_group'),
  );

  if (budgetConditions.length === 0) {
    return [];
  }

  if (!budgetConditions.every(isSupportedCategoryCondition)) {
    return [];
  }

  const matchingCategoryIds = filterCategoriesByConditions(
    categories,
    categoryGroups,
    budgetConditions,
    conditionsOp ?? 'and',
  ).map(category => category.id);

  return [{ category: { $oneof: matchingCategoryIds } }];
}

export function createSpendingSpreadsheet({
  conditions = [],
  conditionsOp,
  compare,
  compareTo,
  averageRange,
  budgetType = 'envelope',
}: createSpendingSpreadsheetProps) {
  const compareMonth = compare ?? monthUtils.currentMonth();
  const compareToMonth = compareTo ?? monthUtils.subMonths(compareMonth, 1);
  const endDate = monthUtils.getMonthEnd(compareMonth + '-01');
  const startDateTo = compareToMonth + '-01';
  const endDateTo = monthUtils.getMonthEnd(compareToMonth + '-01');
  const interval = 'Daily';
  const compareInterval = monthUtils.dayRangeInclusive(
    compareMonth + '-01',
    endDate,
  );

  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: SpendingEntity) => void,
  ) => {
    const earliestTrans =
      averageRange?.mode === 'all-time'
        ? await send('get-earliest-transaction')
        : null;
    const earliestMonth = earliestTrans
      ? monthUtils.monthFromDate(fromDateRepr(earliestTrans.date))
      : null;
    const resolvedAverageRange = resolveSpendingAverageRange({
      averageRange,
      compare: compareMonth,
      earliestMonth,
    });
    const averageMonths = new Set(resolvedAverageRange.months);
    const startDate = (resolvedAverageRange.startMonth ?? compareMonth) + '-01';

    const { filters } = await send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    });

    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    const [assets, debts] = await Promise.all([
      aqlQuery(
        makeQuery(
          'assets',
          startDate,
          endDate,
          interval,
          conditionsOpKey,
          filters,
        ),
      ).then(({ data }) => data),
      aqlQuery(
        makeQuery(
          'debts',
          startDate,
          endDate,
          interval,
          conditionsOpKey,
          filters,
        ),
      ).then(({ data }) => data),
    ]);

    const [assetsTo, debtsTo] = await Promise.all([
      aqlQuery(
        makeQuery(
          'assets',
          startDateTo,
          endDateTo,
          interval,
          conditionsOpKey,
          filters,
        ),
      ).then(({ data }) => data),
      aqlQuery(
        makeQuery(
          'debts',
          startDateTo,
          endDateTo,
          interval,
          conditionsOpKey,
          filters,
        ),
      ).then(({ data }) => data),
    ]);

    const overlapAssets =
      endDateTo < startDate || startDateTo > endDate ? assetsTo : [];
    const overlapDebts =
      endDateTo < startDate || startDateTo > endDate ? debtsTo : [];

    const combineAssets = [...assets, ...overlapAssets];
    const combineDebts = [...debts, ...overlapDebts];
    const totalsByDate = new Map<
      string,
      { perIntervalAssets: number; perIntervalDebts: number }
    >();

    combineAssets
      .filter(e => !e.categoryIncome && !e.accountOffBudget)
      .forEach(asset => {
        const totals = totalsByDate.get(asset.date) ?? {
          perIntervalAssets: 0,
          perIntervalDebts: 0,
        };
        totals.perIntervalAssets += asset.amount;
        totalsByDate.set(asset.date, totals);
      });

    combineDebts
      .filter(e => !e.categoryIncome && !e.accountOffBudget)
      .forEach(debt => {
        const totals = totalsByDate.get(debt.date) ?? {
          perIntervalAssets: 0,
          perIntervalDebts: 0,
        };
        totals.perIntervalDebts += debt.amount;
        totalsByDate.set(debt.date, totals);
      });

    const budgetMonth = parseInt(compareMonth.replace('-', ''));
    const budgetTable =
      budgetType === 'tracking' ? 'reflect_budgets' : 'zero_budgets';
    const hasBudgetConditions = conditions.some(
      cond =>
        !cond.customName &&
        (cond.field === 'category' || cond.field === 'category_group'),
    );
    const budgetFilters = hasBudgetConditions
      ? await send('get-categories').then(({ list, grouped }) =>
          getSpendingBudgetFilters({
            categories: list,
            categoryGroups: grouped,
            conditions,
            conditionsOp,
          }),
        )
      : [];
    const [budgets] = await Promise.all([
      aqlQuery(
        q(budgetTable)
          .filter({
            $and: [{ month: { $eq: budgetMonth } }, ...budgetFilters],
          })
          .groupBy([{ $id: '$category' }])
          .select([
            { category: { $id: '$category' } },
            { amount: { $sum: '$amount' } },
          ]),
      ).then(({ data }) => data),
    ]);

    const dailyBudget =
      budgets &&
      budgets.reduce((a, v) => a + v.amount, 0) / compareInterval.length;

    const intervals = monthUtils.dayRangeInclusive(startDate, endDate);
    if (endDateTo < startDate || startDateTo > endDate) {
      intervals.push(...monthUtils.dayRangeInclusive(startDateTo, endDateTo));
    }

    const days = [...Array(29).keys()]
      .filter(f => f > 0)
      .map(n => n.toString().padStart(2, '0'));

    let totalAssets = 0;
    let totalDebts = 0;
    let totalBudget = 0;

    const months = monthUtils.rangeInclusive(startDate, endDate).map(month => {
      return { month, perMonthAssets: 0, perMonthDebts: 0 };
    });

    if (endDateTo < startDate || startDateTo > endDate) {
      months.unshift({
        month: compareToMonth,
        perMonthAssets: 0,
        perMonthDebts: 0,
      });
    }

    const intervalData = days.map(day => {
      let averageSum = 0;
      let monthCount = 0;
      const dayData = months.map(month => {
        const data = intervals.reduce((arr, intervalItem) => {
          const offsetDay =
            Number(intervalItem.substring(8, 10)) >= 28
              ? '28'
              : intervalItem.substring(8, 10);
          let perIntervalAssets = 0;
          let perIntervalDebts = 0;

          if (
            month.month === monthUtils.getMonth(intervalItem) &&
            day === offsetDay
          ) {
            const totals = totalsByDate.get(intervalItem);
            perIntervalAssets += totals?.perIntervalAssets ?? 0;
            perIntervalDebts += totals?.perIntervalDebts ?? 0;

            totalAssets += perIntervalAssets;
            totalDebts += perIntervalDebts;

            let cumulativeAssets = 0;
            let cumulativeDebts = 0;

            if (month.month === compareMonth) {
              totalBudget -= dailyBudget;
            }

            months.map(m => {
              if (m.month === month.month) {
                cumulativeAssets = m.perMonthAssets += perIntervalAssets;
                cumulativeDebts = m.perMonthDebts += perIntervalDebts;
              }
              return null;
            });

            if (averageMonths.has(month.month)) {
              if (day === '28') {
                if (monthUtils.getMonthEnd(intervalItem) === intervalItem) {
                  averageSum += cumulativeAssets + cumulativeDebts;
                  monthCount += 1;
                }
              } else {
                averageSum += cumulativeAssets + cumulativeDebts;
                monthCount += 1;
              }
            }

            arr.push({
              date: intervalItem,
              totalDebts: perIntervalDebts,
              totalAssets: perIntervalAssets,
              totalTotals: perIntervalDebts + perIntervalAssets,
              cumulative:
                intervalItem <= monthUtils.currentDay()
                  ? cumulativeDebts + cumulativeAssets
                  : null,
            });
          }

          return arr;
        }, []);
        const maxCumulative = data.reduce((a, b) =>
          b.cumulative === null ? a : b,
        ).cumulative;

        const totalDaily = data.reduce((a, v) => a + v.totalTotals, 0);

        return {
          date: data[0].date,
          cumulative: maxCumulative,
          daily: totalDaily,
          month: month.month,
        };
      });
      const indexedData: SpendingMonthEntity = keyBy(dayData, 'month');
      return {
        months: indexedData,
        day,
        average: monthCount === 0 ? 0 : Math.round(averageSum / monthCount),
        compare: dayData.filter(c => c.month === compareMonth)[0].cumulative,
        compareTo: dayData.filter(c => c.month === compareToMonth)[0]
          .cumulative,
        budget: totalBudget,
      };
    });

    setData({
      intervalData,
      averageRange: resolvedAverageRange,
      startDate,
      endDate,
      totalDebts,
      totalAssets,
      totalTotals: totalAssets + totalDebts,
    });
  };
}
