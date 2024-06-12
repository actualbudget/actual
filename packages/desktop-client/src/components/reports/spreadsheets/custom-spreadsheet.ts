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
  type IntervalEntity,
} from 'loot-core/src/types/models/reports';
import { type LocalPrefs } from 'loot-core/types/prefs';

import {
  categoryLists,
  groupBySelections,
  type QueryDataEntity,
  ReportOptions,
  type UncategorizedEntity,
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
  balanceTypeOp?: 'totalAssets' | 'totalDebts' | 'totalTotals';
  payees?: PayeeEntity[];
  accounts?: AccountEntity[];
  graphType?: string;
  firstDayOfWeekIdx?: LocalPrefs['firstDayOfWeekIdx'];
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
  groupBy = '',
  balanceTypeOp = 'totalDebts',
  payees = [],
  accounts = [],
  graphType,
  firstDayOfWeekIdx,
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

  const [groupByList, groupByLabel]: [
    groupByList: UncategorizedEntity[],
    groupByLabel: 'category' | 'categoryGroup' | 'payee' | 'account',
  ] = groupBySelections(groupBy, categoryList, categoryGroup, payees, accounts);

  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: DataEntity) => void,
  ) => {
    if (groupByList.length === 0) {
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
          categoryFilter,
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

    let totalAssets = 0;
    let totalDebts = 0;
    let totalNetAssets = 0;
    let totalNetDebts = 0;

    const intervalData = intervals.reduce(
      (arr: IntervalEntity[], intervalItem, index) => {
        let perIntervalAssets = 0;
        let perIntervalDebts = 0;
        let perIntervalNetAssets = 0;
        let perIntervalNetDebts = 0;
        let perIntervalTotals = 0;
        const stacked: Record<string, number> = {};

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

          stackAmounts += intervalAssets + intervalDebts;

          if (balanceTypeOp === 'totalAssets') {
            stackAmounts = stackAmounts > 0 ? stackAmounts : 0;
          }
          if (balanceTypeOp === 'totalDebts') {
            stackAmounts = stackAmounts < 0 ? Math.abs(stackAmounts) : 0;
          }
          if (stackAmounts !== 0) {
            stacked[item.name] = integerToAmount(stackAmounts);
          }

          const intervalTotals = intervalAssets + intervalDebts;

          perIntervalNetAssets =
            intervalTotals > 0
              ? perIntervalNetAssets + intervalTotals
              : perIntervalNetAssets;
          perIntervalNetDebts =
            intervalTotals < 0
              ? perIntervalNetDebts + intervalTotals
              : perIntervalNetDebts;
          perIntervalTotals += intervalTotals;

          return null;
        });
        totalAssets += perIntervalAssets;
        totalDebts += perIntervalDebts;
        totalNetAssets += perIntervalNetAssets;
        totalNetDebts += perIntervalNetDebts;

        arr.push({
          date: d.format(
            d.parseISO(intervalItem),
            ReportOptions.intervalFormat.get(interval) || '',
          ),
          ...stacked,
          intervalStartDate: index === 0 ? startDate : intervalItem,
          intervalEndDate:
            index + 1 === intervals.length
              ? endDate
              : monthUtils.subDays(intervals[index + 1], 1),
          totalAssets: integerToAmount(perIntervalAssets),
          totalDebts: integerToAmount(perIntervalDebts),
          netAssets: integerToAmount(perIntervalNetAssets),
          netDebts: integerToAmount(perIntervalNetDebts),
          totalTotals: integerToAmount(perIntervalTotals),
        });

        return arr;
      },
      [],
    );

    const calcData: GroupedEntity[] = groupByList.map(item => {
      const calc = recalculate({
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
      });
      return { ...calc };
    });
    const balanceName =
      balanceTypeOp === 'totalAssets'
        ? 'netAssets'
        : balanceTypeOp === 'totalDebts'
          ? 'netDebts'
          : 'totalTotals';
    const calcDataFiltered = calcData
      .filter(j => Math.abs(j[balanceName] || 0) > 0)
      .filter(i => filterEmptyRows({ showEmpty, data: i, balanceTypeOp }));
    const totalTotals = totalAssets + totalDebts;

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
      totalAssets: integerToAmount(totalAssets),
      totalDebts: integerToAmount(totalDebts),
      netAssets: integerToAmount(totalNetAssets),
      netDebts: integerToAmount(totalNetDebts),
      totalTotals: integerToAmount(totalTotals),
    });
    setDataCheck?.(true);
  };
}
