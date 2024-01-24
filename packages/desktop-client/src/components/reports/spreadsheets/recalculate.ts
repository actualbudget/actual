// @ts-strict-ignore
import * as d from 'date-fns';

import { amountToInteger, integerToAmount } from 'loot-core/src/shared/util';

import { type QueryDataEntity } from '../ReportOptions';

import { filterHiddenItems } from './filterHiddenItems';

type recalculateProps = {
  item;
  months: Array<string>;
  assets: QueryDataEntity[];
  debts: QueryDataEntity[];
  groupByLabel: string;
  showOffBudget?: boolean;
  showUncategorized?: boolean;
  showHiddenCategories?: boolean;
};

export function recalculate({
  item,
  months,
  assets,
  debts,
  groupByLabel,
  showOffBudget,
  showUncategorized,
  showHiddenCategories,
}: recalculateProps) {
  let totalAssets = 0;
  let totalDebts = 0;
  const monthData = months.reduce((arr, month) => {
    const last = arr.length === 0 ? null : arr[arr.length - 1];

    const monthAssets = filterHiddenItems(
      item,
      assets,
      showOffBudget,
      showUncategorized,
      showHiddenCategories,
    )
      .filter(asset => asset.date === month && asset[groupByLabel] === item.id)
      .reduce((a, v) => (a = a + v.amount), 0);
    totalAssets += monthAssets;

    const monthDebts = filterHiddenItems(
      item,
      debts,
      showOffBudget,
      showUncategorized,
      showHiddenCategories,
    )
      .filter(debt => debt.date === month && debt[groupByLabel] === item.id)
      .reduce((a, v) => (a = a + v.amount), 0);
    totalDebts += monthDebts;

    const dateParse = d.parseISO(`${month}-01`);

    const change = last
      ? monthAssets + monthDebts - amountToInteger(last.totalTotals)
      : 0;

    arr.push({
      dateParse,
      totalAssets: integerToAmount(monthAssets),
      totalDebts: integerToAmount(monthDebts),
      totalTotals: integerToAmount(monthAssets + monthDebts),
      change,
      // eslint-disable-next-line rulesdir/typography
      date: d.format(dateParse, "MMM ''yy"),
      dateLookup: month,
    });

    return arr;
  }, []);

  return {
    id: item.id,
    name: item.name,
    totalAssets: integerToAmount(totalAssets),
    totalDebts: integerToAmount(totalDebts),
    totalTotals: integerToAmount(totalAssets + totalDebts),
    monthData,
  };
}
