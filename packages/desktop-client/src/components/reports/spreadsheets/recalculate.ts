// @ts-strict-ignore
import { amountToInteger, integerToAmount } from 'loot-core/src/shared/util';

import { type QueryDataEntity } from '../ReportOptions';

import { filterHiddenItems } from './filterHiddenItems';

type recalculateProps = {
  item;
  intervals: Array<string>;
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
  const intervalData = intervals.reduce((arr, interval) => {
  const intervalData = intervals.reduce((arr, inter) => {
    const last = arr.length === 0 ? null : arr[arr.length - 1];

    const intervalAssets = filterHiddenItems(
    const intervalAssets = filterHiddenItems(
      item,
      assets,
      showOffBudget,
      showHiddenCategories,
      showUncategorized,
    )
      .filter(
        asset =>
          asset.date === interval && asset[groupByLabel] === (item.id ?? null),
          asset.date === inter && asset[groupByLabel] === (item.id ?? null),
      )
      .reduce((a, v) => (a = a + v.amount), 0);
    totalAssets += intervalAssets;
    totalAssets += intervalAssets;

    const intervalDebts = filterHiddenItems(
    const intervalDebts = filterHiddenItems(
      item,
      debts,
      showOffBudget,
      showHiddenCategories,
      showUncategorized,
    )
      .filter(
        debt =>
          debt.date === interval && debt[groupByLabel] === (item.id ?? null),
        debt => debt.date === inter && debt[groupByLabel] === (item.id ?? null),
      )
      .reduce((a, v) => (a = a + v.amount), 0);
    totalDebts += intervalDebts;
    totalDebts += intervalDebts;

    const change = last
      ? intervalAssets + intervalDebts - amountToInteger(last.totalTotals)
      ? intervalAssets + intervalDebts - amountToInteger(last.totalTotals)
      : 0;

    arr.push({
      totalAssets: integerToAmount(intervalAssets),
      totalDebts: integerToAmount(intervalDebts),
      totalTotals: integerToAmount(intervalAssets + intervalDebts),
      totalAssets: integerToAmount(intervalAssets),
      totalDebts: integerToAmount(intervalDebts),
      totalTotals: integerToAmount(intervalAssets + intervalDebts),
      change,
      dateLookup: inter,
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
