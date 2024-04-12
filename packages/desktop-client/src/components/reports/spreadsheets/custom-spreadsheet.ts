// @ts-strict-ignore
import * as d from 'date-fns';

import { runQuery } from 'loot-core/src/client/query-helpers';
import { type useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToAmount } from 'loot-core/src/shared/util';
import {
  type AccountEntity,
  type PayeeEntity,
  type CategoryEntity,
  type RuleConditionEntity,
  type CategoryGroupEntity,
} from 'loot-core/src/types/models';
import {
  type DataEntity,
  type GroupedEntity,
} from 'loot-core/src/types/models/reports';

import {
  categoryLists,
  groupBySelections,
  ReportOptions,
} from '../ReportOptions';

import { calculateLegend } from './calculateLegend';
import { filterEmptyRows } from './filterEmptyRows';
import { filterHiddenItems } from './filterHiddenItems';
import { makeQuery } from './makeQuery';
import { recalculate } from './recalculate';

export type createCustomSpreadsheetProps = {
  startDate: string;
  endDate: string;
  interval: string;
  categories: { list: CategoryEntity[]; grouped: CategoryGroupEntity[] };
  selectedCategories: CategoryEntity[];
  conditions: RuleConditionEntity[];
  conditionsOp: string;
  showEmpty: boolean;
  showOffBudget: boolean;
  showHiddenCategories: boolean;
  showUncategorized: boolean;
  groupBy?: string;
  balanceTypeOp?: keyof DataEntity;
  payees?: PayeeEntity[];
  accounts?: AccountEntity[];
  graphType?: string;
  setDataCheck?: (value: boolean) => void;
};

export function createCustomSpreadsheet({
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
  groupBy,
  balanceTypeOp,
  payees,
  accounts,
  graphType,
  setDataCheck,
}: createCustomSpreadsheetProps) {
  const [categoryList, categoryGroup] = categoryLists(categories);

  const categoryFilter = (categories.list || []).filter(
    category =>
      selectedCategories &&
      selectedCategories.some(
        selectedCategory => selectedCategory.id === category.id,
      ),
  );

  const [groupByList, groupByLabel] = groupBySelections(
    groupBy,
    categoryList,
    categoryGroup,
    payees,
    accounts,
  );

  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: GroupedEntity) => void,
  ) => {
    if (groupByList.length === 0) {
      return;
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

    const format =
      ReportOptions.intervalMap.get(interval).toLowerCase() + 'FromDate';
    const intervals = monthUtils[ReportOptions.intervalRange.get(interval)](
      monthUtils[format](startDate),
      monthUtils[format](endDate),
    );

    let totalAssets = 0;
    let totalDebts = 0;

    const intervalData = intervals.reduce((arr, intervalItem) => {
      let perIntervalAssets = 0;
      let perIntervalDebts = 0;
      const stacked = {};

      groupByList.map(item => {
        let stackAmounts = 0;

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
        perIntervalAssets += intervalAssets;

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
        perIntervalDebts += intervalDebts;

        if (balanceTypeOp === 'totalAssets') {
          stackAmounts += intervalAssets;
        }
        if (balanceTypeOp === 'totalDebts') {
          stackAmounts += intervalDebts;
        }
        if (stackAmounts !== 0) {
          stacked[item.name] = integerToAmount(Math.abs(stackAmounts));
        }

        return null;
      });
      totalAssets += perIntervalAssets;
      totalDebts += perIntervalDebts;

      arr.push({
        date:
          interval === 'Monthly'
            ? // eslint-disable-next-line rulesdir/typography
              d.format(d.parseISO(`${intervalItem}-01`), "MMM ''yy")
            : intervalItem,
        ...stacked,
        dateStart: intervalItem,
        totalDebts: integerToAmount(perIntervalDebts),
        totalAssets: integerToAmount(perIntervalAssets),
        totalTotals: integerToAmount(perIntervalDebts + perIntervalAssets),
      });

      return arr;
    }, []);

    const calcData = groupByList.map(item => {
      const calc = recalculate({
        item,
        intervals,
        assets,
        debts,
        groupByLabel,
        showOffBudget,
        showHiddenCategories,
        showUncategorized,
      });
      return { ...calc };
    });
    const calcDataFiltered = calcData.filter(i =>
      filterEmptyRows(showEmpty, i, balanceTypeOp),
    );

    const legend = calculateLegend(
      intervalData,
      calcDataFiltered,
      groupBy,
      graphType,
      balanceTypeOp,
    );

    setData({
      data: calcDataFiltered,
      intervalData,
      legend,
      startDate,
      endDate,
      totalDebts: integerToAmount(totalDebts),
      totalAssets: integerToAmount(totalAssets),
      totalTotals: integerToAmount(totalAssets + totalDebts),
    });
    setDataCheck?.(true);
  };
}
