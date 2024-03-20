// @ts-strict-ignore
import { amountToInteger, integerToAmount } from 'loot-core/src/shared/util';

import { type QueryDataEntity } from '../ReportOptions';

import { filterHiddenItems } from './filterHiddenItems';

type recalculateProps = {
  item;
  intervals: Array<string>;
  assets: QueryDataEntity[];
  debts: QueryDataEntity[];
  groupByLabel: string;
  showOffBudget?: boolean;
  showHiddenCategories?: boolean;
  showUncategorized?: boolean;
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
}: recalculateProps) {
  let totalAssets = 0;
  let totalDebts = 0;
  const intervalData = intervals.reduce((arr, intervalItem) => {
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

    const change = last
      ? intervalAssets + intervalDebts - amountToInteger(last.totalTotals)
      : 0;

    arr.push({
      totalAssets: integerToAmount(intervalAssets),
      totalDebts: integerToAmount(intervalDebts),
      totalTotals: integerToAmount(intervalAssets + intervalDebts),
      change,
      dateLookup: intervalItem,
    });

    return arr;
  }, []);

  return {
    id: item.id,
    name: item.name,
    totalAssets: integerToAmount(totalAssets),
    totalDebts: integerToAmount(totalDebts),
    totalTotals: integerToAmount(totalAssets + totalDebts),
    intervalData,
  };
}
