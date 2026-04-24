// @ts-strict-ignore
import keyBy from 'lodash/keyBy';

import { send } from 'loot-core/platform/client/connection';
import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import type {
  CategoryEntity,
  RuleConditionEntity,
  SpendingEntity,
  SpendingMonthEntity,
} from 'loot-core/types/models';

import { makeQuery } from './makeQuery';

import type { useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';

type createSpendingSpreadsheetProps = {
  conditions?: RuleConditionEntity[];
  conditionsOp?: string;
  compare?: string;
  compareTo?: string;
  budgetType?: 'envelope' | 'tracking';
  budgetCategoryScope?: 'all' | 'filtered';
};

export function createSpendingSpreadsheet({
  conditions = [],
  conditionsOp,
  compare,
  compareTo,
  budgetType = 'envelope',
  budgetCategoryScope = 'filtered',
}: createSpendingSpreadsheetProps) {
  const startDate = monthUtils.subMonths(compare, 3) + '-01';
  const endDate = monthUtils.getMonthEnd(compare + '-01');
  const startDateTo = compareTo + '-01';
  const endDateTo = monthUtils.getMonthEnd(compareTo + '-01');
  const interval = 'Daily';
  const compareInterval = monthUtils.dayRangeInclusive(
    compare + '-01',
    endDate,
  );

  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: SpendingEntity) => void,
  ) => {
    const { filters } = await send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    });

    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    // Resolve which category IDs to filter the budget query by.
    // We do this in JS rather than via make-filters-from-conditions because
    // zero_budgets/reflect_budgets only have a raw `category` column — there
    // is no join for category.group, so AQL-based group filters silently
    // return all rows.
    let budgetCategoryIds: string[] | null = null;
    if (budgetCategoryScope === 'filtered') {
      const categoryConditions = conditions.filter(
        cond =>
          !cond.customName &&
          (cond.field === 'category' || cond.field === 'category_group'),
      );
      if (categoryConditions.length > 0) {
        const { list: allCategories } = await send('get-categories');
        const matched = new Set<string>();
        for (const cond of categoryConditions) {
          for (const cat of allCategories as CategoryEntity[]) {
            const v = cond.value;
            let hits = false;
            if (cond.field === 'category') {
              if (cond.op === 'is') {
                hits = cat.id === v;
              } else if (cond.op === 'isNot') {
                hits = cat.id !== v;
              } else if (cond.op === 'oneOf') {
                hits = Array.isArray(v) && v.includes(cat.id);
              } else if (cond.op === 'notOneOf') {
                hits = Array.isArray(v) && !v.includes(cat.id);
              }
            } else {
              // category_group
              if (cond.op === 'is') {
                hits = cat.group === v;
              } else if (cond.op === 'isNot') {
                hits = cat.group !== v;
              } else if (cond.op === 'oneOf') {
                hits = Array.isArray(v) && v.includes(cat.group);
              } else if (cond.op === 'notOneOf') {
                hits = Array.isArray(v) && !v.includes(cat.group);
              }
            }
            if (hits) matched.add(cat.id);
          }
        }
        if (matched.size > 0) {
          budgetCategoryIds = [...matched];
        }
      }
    }

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

    const budgetMonth = parseInt(compare.replace('-', ''));
    const budgetTable =
      budgetType === 'tracking' ? 'reflect_budgets' : 'zero_budgets';
    const budgetBaseQuery = q(budgetTable).filter({
      $and: [{ month: { $eq: budgetMonth } }],
    });
    const budgetFilteredQuery =
      budgetCategoryIds !== null
        ? budgetBaseQuery.filter({
            $or: budgetCategoryIds.map(id => ({ category: { $eq: id } })),
          })
        : budgetBaseQuery;
    const [budgets] = await Promise.all([
      aqlQuery(
        budgetFilteredQuery
          .groupBy([{ $id: '$category' }])
          .select([
            { category: { $id: '$category' } },
            { amount: { $sum: '$amount' } },
          ]),
      ).then(({ data }) => data),
    ]);

    const dailyBudget =
      budgets &&
      budgets.reduce((a, v) => (a = a + v.amount), 0) / compareInterval.length;

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
        month: compareTo,
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
            const intervalAssets = combineAssets
              .filter(e => !e.categoryIncome && !e.accountOffBudget)
              .filter(asset => asset.date === intervalItem)
              .reduce((a, v) => (a = a + v.amount), 0);
            perIntervalAssets += intervalAssets;

            const intervalDebts = combineDebts
              .filter(e => !e.categoryIncome && !e.accountOffBudget)
              .filter(debt => debt.date === intervalItem)
              .reduce((a, v) => (a = a + v.amount), 0);
            perIntervalDebts += intervalDebts;

            totalAssets += perIntervalAssets;
            totalDebts += perIntervalDebts;

            let cumulativeAssets = 0;
            let cumulativeDebts = 0;

            if (month.month === compare) {
              totalBudget -= dailyBudget;
            }

            months.map(m => {
              if (m.month === month.month) {
                cumulativeAssets = m.perMonthAssets += perIntervalAssets;
                cumulativeDebts = m.perMonthDebts += perIntervalDebts;
              }
              return null;
            });

            if (
              month.month >= monthUtils.monthFromDate(startDate) &&
              month.month < compare
            ) {
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

        const totalDaily = data.reduce((a, v) => (a = a + v.totalTotals), 0);

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
        average: Math.round(averageSum / monthCount),
        compare: dayData.filter(c => c.month === compare)[0].cumulative,
        compareTo: dayData.filter(c => c.month === compareTo)[0].cumulative,
        budget: totalBudget,
      };
    });

    setData({
      intervalData,
      startDate,
      endDate,
      totalDebts,
      totalAssets,
      totalTotals: totalAssets + totalDebts,
    });
  };
}
