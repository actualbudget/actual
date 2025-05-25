import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { type GroupedEntity } from 'loot-core/types/models';

import { type createCustomSpreadsheetProps } from './custom-spreadsheet';
import { filterEmptyRows } from './filterEmptyRows';
import { makeQuery } from './makeQuery';
import { recalculate } from './recalculate';
import { sortData } from './sortData';

import {
  categoryLists,
  type QueryDataEntity,
  ReportOptions,
} from '@desktop-client/components/reports/ReportOptions';
import { type useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';

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
  sortByOp,
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
        const grouped = recalculate({
          item: group,
          intervals,
          assets,
          debts,
          groupByLabel: 'categoryGroup',
          showOffBudget,
          showHiddenCategories,
          showUncategorized,
          startDate,
          endDate,
        });

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
          ...grouped,
          categories:
            stackedCategories &&
            stackedCategories.filter(i =>
              filterEmptyRows({ showEmpty, data: i, balanceTypeOp }),
            ),
        };
      },
      [startDate, endDate],
    );

    const groupedDataFiltered = groupedData.filter(i =>
      filterEmptyRows({ showEmpty, data: i, balanceTypeOp }),
    );

    const sortedGroupedDataFiltered = [...groupedDataFiltered]
      .sort(sortData({ balanceTypeOp, sortByOp }))
      .map(g => {
        g.categories = [...(g.categories ?? [])].sort(
          sortData({ balanceTypeOp, sortByOp }),
        );
        return g;
      });

    setData(sortedGroupedDataFiltered);
  };
}
