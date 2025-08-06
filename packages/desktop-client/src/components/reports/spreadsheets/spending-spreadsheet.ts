// @ts-strict-ignore
import keyBy from 'lodash/keyBy';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import {
  type RuleConditionEntity,
  type SpendingMonthEntity,
  type SpendingEntity,
} from 'loot-core/types/models';

import { makeQuery } from './makeQuery';

import { type useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';

type createSpendingSpreadsheetProps = {
  conditions?: RuleConditionEntity[];
  conditionsOp?: string;
  compare?: string;
  compareTo?: string;
};

export function createSpendingSpreadsheet({
  conditions = [],
  conditionsOp,
  compare,
  compareTo,
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
