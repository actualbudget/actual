import * as d from 'date-fns';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import {
  type AccountEntity,
  type PayeeEntity,
  type CategoryEntity,
  type RuleConditionEntity,
  type CategoryGroupEntity,
  type balanceTypeOpType,
  type sortByOpType,
  type DataEntity,
  type GroupedEntity,
  type IntervalEntity,
} from 'loot-core/types/models';
import { type SyncedPrefs } from 'loot-core/types/prefs';

import { calculateLegend } from './calculateLegend';
import { filterEmptyRows } from './filterEmptyRows';
import { filterHiddenItems } from './filterHiddenItems';
import { makeQuery } from './makeQuery';
import { recalculate } from './recalculate';
import { sortData } from './sortData';

import {
  categoryLists,
  groupBySelections,
  type QueryDataEntity,
  ReportOptions,
  type UncategorizedEntity,
} from '@desktop-client/components/reports/ReportOptions';
import { type useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';

export type createCustomSpreadsheetProps = {
  startDate: string;
  endDate: string;
  interval: string;
  categories: { list: CategoryEntity[]; grouped: CategoryGroupEntity[] };
  conditions: RuleConditionEntity[];
  conditionsOp: string;
  showEmpty: boolean;
  showOffBudget: boolean;
  showHiddenCategories: boolean;
  showUncategorized: boolean;
  groupBy?: string;
  balanceTypeOp?: balanceTypeOpType;
  sortByOp?: sortByOpType;
  payees?: PayeeEntity[];
  accounts?: AccountEntity[];
  graphType?: string;
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'];
  setDataCheck?: (value: boolean) => void;
};

export function createCustomSpreadsheet({
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
  groupBy = '',
  balanceTypeOp = 'totalDebts',
  sortByOp = 'desc',
  payees = [],
  accounts = [],
  graphType,
  firstDayOfWeekIdx,
  setDataCheck,
}: createCustomSpreadsheetProps) {
  const [categoryList, categoryGroup] = categoryLists(categories);

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

    let totalAssets = 0;
    let totalDebts = 0;
    let netAssets = 0;
    let netDebts = 0;

    const groupsByCategory =
      groupByLabel === 'category' || groupByLabel === 'categoryGroup';
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
            groupsByCategory,
          )
            .filter(
              asset =>
                asset.date === intervalItem &&
                (asset[groupByLabel] === (item.id ?? null) ||
                  (item.uncategorized_id && groupsByCategory)),
            )
            .reduce((a, v) => (a = a + v.amount), 0);
          perIntervalAssets += intervalAssets;

          const intervalDebts = filterHiddenItems(
            item,
            debts,
            showOffBudget,
            showHiddenCategories,
            showUncategorized,
            groupsByCategory,
          )
            .filter(
              debt =>
                debt.date === intervalItem &&
                (debt[groupByLabel] === (item.id ?? null) ||
                  (item.uncategorized_id && groupsByCategory)),
            )
            .reduce((a, v) => (a = a + v.amount), 0);
          perIntervalDebts += intervalDebts;

          const netAmounts = intervalAssets + intervalDebts;

          if (balanceTypeOp === 'totalAssets') {
            stackAmounts += intervalAssets;
          }
          if (balanceTypeOp === 'totalDebts') {
            stackAmounts += Math.abs(intervalDebts);
          }
          if (balanceTypeOp === 'netAssets') {
            stackAmounts += netAmounts > 0 ? netAmounts : 0;
          }
          if (balanceTypeOp === 'netDebts') {
            stackAmounts = netAmounts < 0 ? Math.abs(netAmounts) : 0;
          }
          if (balanceTypeOp === 'totalTotals') {
            stackAmounts += netAmounts;
          }
          if (stackAmounts !== 0) {
            stacked[item.name] = stackAmounts; // TODO: not sure yet
          }

          perIntervalNetAssets =
            netAmounts > 0
              ? perIntervalNetAssets + netAmounts
              : perIntervalNetAssets;
          perIntervalNetDebts =
            netAmounts < 0
              ? perIntervalNetDebts + netAmounts
              : perIntervalNetDebts;
          perIntervalTotals += netAmounts;

          return null;
        });
        totalAssets += perIntervalAssets;
        totalDebts += perIntervalDebts;
        netAssets += perIntervalNetAssets;
        netDebts += perIntervalNetDebts;

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
          totalAssets: perIntervalAssets,
          totalDebts: perIntervalDebts,
          netAssets: perIntervalNetAssets,
          netDebts: perIntervalNetDebts,
          totalTotals: perIntervalTotals,
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
    const calcDataFiltered = calcData.filter(i =>
      filterEmptyRows({ showEmpty, data: i, balanceTypeOp }),
    );

    const sortedCalcDataFiltered = [...calcDataFiltered].sort(
      sortData({ balanceTypeOp, sortByOp }),
    );

    const legend = calculateLegend(
      intervalData,
      sortedCalcDataFiltered,
      groupBy,
      graphType,
      balanceTypeOp,
    );

    setData({
      data: sortedCalcDataFiltered,
      intervalData,
      legend,
      startDate,
      endDate,
      totalAssets,
      totalDebts,
      netAssets,
      netDebts,
      totalTotals: totalAssets + totalDebts,
    });
    setDataCheck?.(true);
  };
}
