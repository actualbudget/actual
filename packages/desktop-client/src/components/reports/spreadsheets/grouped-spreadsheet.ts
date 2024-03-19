// @ts-strict-ignore
import { runQuery } from 'loot-core/src/client/query-helpers';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToAmount } from 'loot-core/src/shared/util';
import { type GroupedEntity } from 'loot-core/src/types/models/reports';

import { categoryLists } from '../ReportOptions';

import { type createCustomSpreadsheetProps } from './custom-spreadsheet';
import { filterEmptyRows } from './filterEmptyRows';
import { filterHiddenItems } from './filterHiddenItems';
import { makeQuery } from './makeQuery';
import { recalculate } from './recalculate';

export function createGroupedSpreadsheet({
  startDate,
  endDate,
  interval,
  categories,
  selectedCategories,
  conditions = [],
  conditionsOp,
  showEmpty,
  showOffBudget,
  showHiddenCategories,
  showUncategorized,
  balanceTypeOp,
}: createCustomSpreadsheetProps) {
  const [categoryList, categoryGroup] = categoryLists(categories);

  const categoryFilter = (categories.list || []).filter(
    category =>
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
          interval,
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
          interval,
          selectedCategories,
          categoryFilter,
          conditionsOpKey,
          filters,
        ),
      ).then(({ data }) => data),
    ]);

    const rangeInc =
      interval === 'Monthly' ? 'rangeInclusive' : 'yearRangeInclusive';
    const format = interval === 'Monthly' ? 'monthFromDate' : 'yearFromDate';
    const intervals = monthUtils[rangeInc](
      monthUtils[format](startDate),
      monthUtils[format](endDate),
    );

    const groupedData: GroupedEntity[] = categoryGroup.map(
      group => {
        let totalAssets = 0;
        let totalDebts = 0;

        const intervalData = intervals.reduce((arr, intervalItem) => {
          let groupedAssets = 0;
          let groupedDebts = 0;

          group.categories.forEach(item => {
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
                  asset.category === (item.id ?? null),
              )
              .reduce((a, v) => (a = a + v.amount), 0);
            groupedAssets += intervalAssets;

            const intervalDebts = filterHiddenItems(
              item,
              debts,
              showOffBudget,
              showHiddenCategories,
              showUncategorized,
            )
              .filter(
                debts =>
                  debts.date === intervalItem &&
                  debts.category === (item.id ?? null),
              )
              .reduce((a, v) => (a = a + v.amount), 0);
            groupedDebts += intervalDebts;
          });

          totalAssets += groupedAssets;
          totalDebts += groupedDebts;

          arr.push({
            date: intervalItem,
            totalAssets: integerToAmount(groupedAssets),
            totalDebts: integerToAmount(groupedDebts),
            totalTotals: integerToAmount(groupedDebts + groupedAssets),
          });

          return arr;
        }, []);

        const stackedCategories = group.categories.map(item => {
          const calc = recalculate({
            item,
            intervals,
            assets,
            debts,
            groupByLabel: 'category',
            showOffBudget,
            showHiddenCategories,
            showUncategorized,
          });
          return { ...calc };
        });

        return {
          id: group.id,
          name: group.name,
          totalAssets: integerToAmount(totalAssets),
          totalDebts: integerToAmount(totalDebts),
          totalTotals: integerToAmount(totalAssets + totalDebts),
          intervalData,
          categories: stackedCategories.filter(i =>
            filterEmptyRows(showEmpty, i, balanceTypeOp),
          ),
        };
      },
      [startDate, endDate],
    );
    setData(
      groupedData.filter(i => filterEmptyRows(showEmpty, i, balanceTypeOp)),
    );
  };
}
