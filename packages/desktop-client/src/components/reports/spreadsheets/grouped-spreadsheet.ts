// @ts-strict-ignore
import { runQuery } from 'loot-core/src/client/query-helpers';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToAmount } from 'loot-core/src/shared/util';

import { categoryLists } from '../ReportOptions';

import { type createCustomSpreadsheetProps } from './custom-spreadsheet';
import { filterHiddenItems } from './filterHiddenItems';
import { makeQuery } from './makeQuery';
import { recalculate } from './recalculate';

export function createGroupedSpreadsheet({
  startDate,
  endDate,
  categories,
  selectedCategories,
  conditions = [],
  conditionsOp,
  showEmpty,
  showOffBudgetHidden,
  showUncategorized,
  balanceTypeOp,
}: createCustomSpreadsheetProps) {
  const [categoryList, categoryGroup] = categoryLists(
    showOffBudgetHidden,
    showUncategorized,
    categories,
  );

  const categoryFilter = (categoryList || []).filter(
    category =>
      !category.hidden &&
      selectedCategories &&
      selectedCategories.some(
        selectedCategory => selectedCategory.id === category.id,
      ),
  );

  return async (spreadsheet, setData) => {
    if (categoryList.length === 0) {
      return null;
    }

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
          showOffBudgetHidden,
          selectedCategories,
          categoryFilter,
          conditionsOpKey,
          filters,
        ),
      ).then(({ data }) => data),
      runQuery(
        makeQuery(
          'debts',
          startDate,
          endDate,
          showOffBudgetHidden,
          selectedCategories,
          categoryFilter,
          conditionsOpKey,
          filters,
        ),
      ).then(({ data }) => data),
    ]);

    const months = monthUtils.rangeInclusive(startDate, endDate);

    const groupedData = categoryGroup.map(
      group => {
        let totalAssets = 0;
        let totalDebts = 0;

        const monthData = months.reduce((arr, month) => {
          let groupedAssets = 0;
          let groupedDebts = 0;

          group.categories.forEach(item => {
            const monthAssets = filterHiddenItems(item, assets)
              .filter(
                asset => asset.date === month && asset.category === item.id,
              )
              .reduce((a, v) => (a = a + v.amount), 0);
            groupedAssets += monthAssets;

            const monthDebts = filterHiddenItems(item, debts)
              .filter(
                debts => debts.date === month && debts.category === item.id,
              )
              .reduce((a, v) => (a = a + v.amount), 0);
            groupedDebts += monthDebts;
          });

          totalAssets += groupedAssets;
          totalDebts += groupedDebts;

          arr.push({
            date: month,
            totalAssets: integerToAmount(groupedAssets),
            totalDebts: integerToAmount(groupedDebts),
            totalTotals: integerToAmount(groupedDebts + groupedAssets),
          });

          return arr;
        }, []);

        const stackedCategories = group.categories.map(item => {
          const calc = recalculate({
            item,
            months,
            assets,
            debts,
            groupByLabel: 'category',
          });
          return { ...calc };
        });

        return {
          id: group.id,
          name: group.name,
          totalAssets: integerToAmount(totalAssets),
          totalDebts: integerToAmount(totalDebts),
          totalTotals: integerToAmount(totalAssets + totalDebts),
          monthData,
          categories: stackedCategories.filter(i =>
            !showEmpty ? i[balanceTypeOp] !== 0 : true,
          ),
        };
      },
      [startDate, endDate],
    );
    setData(
      groupedData.filter(i => (!showEmpty ? i[balanceTypeOp] !== 0 : true)),
    );
  };
}
