// @ts-strict-ignore

import keyBy from 'lodash/keyBy';

import { runQuery } from 'loot-core/src/client/query-helpers';
import { type useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToAmount } from 'loot-core/src/shared/util';
import {
  type CategoryEntity,
  type RuleConditionEntity,
  type CategoryGroupEntity,
} from 'loot-core/src/types/models';
import {
  type SpendingMonthEntity,
  type SpendingEntity,
} from 'loot-core/src/types/models/reports';

import { getSpecificRange } from '../reportRanges';

import { makeQuery } from './makeQuery';

type createSpendingSpreadsheetProps = {
  categories: { list: CategoryEntity[]; grouped: CategoryGroupEntity[] };
  conditions?: RuleConditionEntity[];
  conditionsOp?: string;
  setDataCheck?: (value: boolean) => void;
};

export function createSpendingSpreadsheet({
  categories,
  conditions = [],
  conditionsOp,
  setDataCheck,
}: createSpendingSpreadsheetProps) {
  const [startDate, endDate] = getSpecificRange(3, null, 'Months');
  const interval = 'Daily';

  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: SpendingEntity) => void,
  ) => {
    const { filters } = await send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    });
    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    const [assets, debts] = await Promise.all([
      runQuery(
        makeQuery(
          'assets',
          startDate,
          endDate,
          interval,
          categories.list,
          conditionsOpKey,
          filters,
        ),
      ).then(({ data }) => data),
      runQuery(
        makeQuery(
          'debts',
          startDate,
          endDate,
          interval,
          categories.list,
          conditionsOpKey,
          filters,
        ),
      ).then(({ data }) => data),
    ]);

    const intervals = monthUtils.dayRangeInclusive(startDate, endDate);
    const days = [...Array(29).keys()]
      .filter(f => f > 0)
      .map(n => n.toString().padStart(2, '0'));

    let totalAssets = 0;
    let totalDebts = 0;

    const months = monthUtils
      .rangeInclusive(startDate, monthUtils.currentMonth() + '-01')
      .map(month => {
        return { month, perMonthAssets: 0, perMonthDebts: 0 };
      });

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
            const intervalAssets = assets
              .filter(e => !e.categoryIncome)
              .filter(asset => asset.date === intervalItem)
              .reduce((a, v) => (a = a + v.amount), 0);
            perIntervalAssets += intervalAssets;

            const intervalDebts = debts
              .filter(e => !e.categoryIncome)
              .filter(debt => debt.date === intervalItem)
              .reduce((a, v) => (a = a + v.amount), 0);
            perIntervalDebts += intervalDebts;

            totalAssets += perIntervalAssets;
            totalDebts += perIntervalDebts;

            let cumulativeAssets = 0;
            let cumulativeDebts = 0;

            months.map(m => {
              if (m.month === month.month) {
                cumulativeAssets = m.perMonthAssets += perIntervalAssets;
                cumulativeDebts = m.perMonthDebts += perIntervalDebts;
              }
              return null;
            });
            if (month.month !== monthUtils.currentMonth()) {
              averageSum += cumulativeAssets + cumulativeDebts;
              monthCount += 1;
            }

            arr.push({
              date: intervalItem,
              totalDebts: integerToAmount(perIntervalDebts),
              totalAssets: integerToAmount(perIntervalAssets),
              totalTotals: integerToAmount(
                perIntervalDebts + perIntervalAssets,
              ),
              cumulative:
                intervalItem <= monthUtils.currentDay()
                  ? integerToAmount(cumulativeDebts + cumulativeAssets)
                  : null,
            });
          }

          return arr;
        }, []);
        const maxCumulative = data.reduce((a, b) =>
          a.cumulative < b.cumulative ? a : b,
        ).cumulative;

        return {
          date: data[0].date,
          cumulative: maxCumulative,
          daily: data[0].totalTotals,
          month: month.month,
        };
      });
      const indexedData: SpendingMonthEntity = keyBy(dayData, 'month');
      return {
        months: indexedData,
        day,
        average: integerToAmount(averageSum) / monthCount,
        thisMonth: dayData[3].cumulative,
        lastMonth: dayData[2].cumulative,
      };
    });

    setData({
      intervalData,
      startDate,
      endDate,
      totalDebts: integerToAmount(totalDebts),
      totalAssets: integerToAmount(totalAssets),
      totalTotals: integerToAmount(totalAssets + totalDebts),
    });
    setDataCheck?.(true);
  };
}
