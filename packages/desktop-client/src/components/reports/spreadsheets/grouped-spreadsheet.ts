import { runQuery } from 'loot-core/src/client/query-helpers';
import { type useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToAmount } from 'loot-core/src/shared/util';
import {
  type IntervalEntity,
  type GroupedEntity,
} from 'loot-core/src/types/models/reports';

import {
  categoryLists,
  type QueryDataEntity,
  ReportOptions,
} from '../ReportOptions';

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
  conditions = [],
  conditionsOp,
  showEmpty,
  showOffBudget,
  showHiddenCategories,
  showUncategorized,
  balanceTypeOp,
  firstDayOfWeekIdx,
}: createCustomSpreadsheetProps) {
  const [categoryList, categoryGroup] = categoryLists(categories);

  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: GroupedEntity[]) => void,
  ) => {
    if (categoryList.length === 0) {
      return;
    }

    const { filters } = await send('make-filters-from-conditions', {
      conditions: conditions.filter(cond => !cond.customName),
    });
    const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

    let assets: QueryDataEntity[];
    let debts: QueryDataEntity[];
    [assets, debts] = await Promise.all([
      runQuery(
        makeQuery(
          'assets',
          startDate,
          endDate,
          interval,
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
          conditionsOpKey,
          filters,
        ),
      ).then(({ data }) => data),
    ]);

    if (interval === 'Weekly') {
      debts = debts.map(d => {
        return {
          ...d,
          date: monthUtils.weekFromDate(d.date, firstDayOfWeekIdx),
        };
      });
      assets = assets.map(d => {
        return {
          ...d,
          date: monthUtils.weekFromDate(d.date, firstDayOfWeekIdx),
        };
      });
    }

    const intervals =
      interval === 'Weekly'
        ? monthUtils.weekRangeInclusive(startDate, endDate, firstDayOfWeekIdx)
        : monthUtils[
            ReportOptions.intervalRange.get(interval) || 'rangeInclusive'
          ](startDate, endDate);

    const groupedData: GroupedEntity[] = categoryGroup.map(
      group => {
        let totalAssets = 0;
        let totalDebts = 0;
        let netAssets = 0;
        let netDebts = 0;

        const intervalData = intervals.reduce(
          (arr: IntervalEntity[], intervalItem) => {
            let groupedAssets = 0;
            let groupedDebts = 0;
            let groupedNetAssets = 0;
            let groupedNetDebts = 0;
            let groupedTotals = 0;

            if (!group.categories) {
              return [];
            }

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

              const intervalTotals = intervalAssets + intervalDebts;

              groupedNetAssets =
                intervalTotals > 0
                  ? groupedNetAssets + intervalTotals
                  : groupedNetAssets;
              groupedNetDebts =
                intervalTotals < 0
                  ? groupedNetDebts + intervalTotals
                  : groupedNetDebts;
              groupedTotals += intervalTotals;
            });

            totalAssets += groupedAssets;
            totalDebts += groupedDebts;
            netAssets += groupedNetAssets;
            netDebts += groupedNetDebts;

            arr.push({
              date: intervalItem,
              totalAssets: integerToAmount(groupedAssets),
              totalDebts: integerToAmount(groupedDebts),
              netAssets: integerToAmount(groupedNetAssets),
              netDebts: integerToAmount(groupedNetDebts),
              totalTotals: integerToAmount(groupedTotals),
            });

            return arr;
          },
          [],
        );

        const stackedCategories =
          group.categories &&
          group.categories.map(item => {
            const calc = recalculate({
              item,
              intervals,
              assets,
              debts,
              groupByLabel: 'category',
              showOffBudget,
              showHiddenCategories,
              showUncategorized,
              startDate,
              endDate,
            });
            return { ...calc };
          });

        return {
          id: group.id || '',
          name: group.name,
          totalAssets: integerToAmount(totalAssets),
          totalDebts: integerToAmount(totalDebts),
          netAssets: integerToAmount(netAssets),
          netDebts: integerToAmount(netDebts),
          totalTotals: integerToAmount(totalAssets + totalDebts),
          intervalData,
          categories:
            stackedCategories &&
            stackedCategories.filter(i =>
              filterEmptyRows({ showEmpty, data: i, balanceTypeOp }),
            ),
        };
      },
      [startDate, endDate],
    );
    setData(
      groupedData.filter(i =>
        filterEmptyRows({ showEmpty, data: i, balanceTypeOp }),
      ),
    );
  };
}
