import * as monthUtils from 'loot-core/src/shared/months';
import { amountToInteger, integerToAmount } from 'loot-core/src/shared/util';
import {
  type GroupedEntity,
  type IntervalEntity,
} from 'loot-core/types/models/reports';

import {
  type UncategorizedEntity,
  type QueryDataEntity,
} from '../ReportOptions';

import { filterHiddenItems } from './filterHiddenItems';

type recalculateProps = {
  item: UncategorizedEntity;
  intervals: Array<string>;
  assets: QueryDataEntity[];
  debts: QueryDataEntity[];
  groupByLabel: 'category' | 'categoryGroup' | 'payee' | 'account';
  showOffBudget?: boolean;
  showHiddenCategories?: boolean;
  showUncategorized?: boolean;
  startDate: string;
  endDate: string;
};

export function recalculate({
  item,
  intervals,
  assets,
  debts,
  groupByLabel,
  showOffBudget,
  showHiddenCategories,
  showUncategorized,
  startDate,
  endDate,
}: recalculateProps): GroupedEntity {
  let totalAssets = 0;
  let totalDebts = 0;
  const intervalData = intervals.reduce(
    (arr: IntervalEntity[], intervalItem, index) => {
      const last = arr.length === 0 ? null : arr[arr.length - 1];

      const intervalAssets = filterHiddenItems(
        item,
        assets,
        showOffBudget,
        showHiddenCategories,
        showUncategorized,
      )
        .filter(
          asset =>
            asset.date === intervalItem &&
            asset[groupByLabel] === (item.id ?? null),
        )
        .reduce((a, v) => (a = a + v.amount), 0);
      totalAssets += intervalAssets;

      const intervalDebts = filterHiddenItems(
        item,
        debts,
        showOffBudget,
        showHiddenCategories,
        showUncategorized,
      )
        .filter(
          debt =>
            debt.date === intervalItem &&
            debt[groupByLabel] === (item.id ?? null),
        )
        .reduce((a, v) => (a = a + v.amount), 0);
      totalDebts += intervalDebts;

      const intervalTotals = intervalAssets + intervalDebts;

      const change = last
        ? intervalTotals - amountToInteger(last.totalTotals)
        : 0;

      arr.push({
        totalAssets: integerToAmount(intervalAssets),
        totalDebts: integerToAmount(intervalDebts),
        netAssets:
          intervalTotals > 0 ? integerToAmount(intervalTotals) : undefined,
        netDebts:
          intervalTotals < 0 ? integerToAmount(intervalTotals) : undefined,
        totalTotals: integerToAmount(intervalTotals),
        change,
        intervalStartDate: index === 0 ? startDate : intervalItem,
        intervalEndDate:
          index + 1 === intervals.length
            ? endDate
            : monthUtils.subDays(intervals[index + 1], 1),
      });

      return arr;
    },
    [],
  );

  const totalTotals = totalAssets + totalDebts;

  return {
    id: item.id || '',
    name: item.name,
    totalAssets: integerToAmount(totalAssets),
    totalDebts: integerToAmount(totalDebts),
    netAssets: totalTotals > 0 ? integerToAmount(totalTotals) : undefined,
    netDebts: totalTotals < 0 ? integerToAmount(totalTotals) : undefined,
    totalTotals: integerToAmount(totalTotals),
    intervalData,
  };
}
