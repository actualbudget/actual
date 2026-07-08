import * as d from 'date-fns';

import { Spreadsheet } from '#server/spreadsheet/spreadsheet';
import { resolveName } from '#server/spreadsheet/util';
import { conditionsToAQL } from '#server/transactions/transaction-rules';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import type {
  AccountEntity,
  balanceTypeOpType,
  CategoryEntity,
  CategoryGroupEntity,
  CustomReportEntity,
  CustomReportWidget,
  GroupedEntity,
  IntervalEntity,
  LegendEntity,
  PayeeEntity,
  RuleConditionEntity,
  sortByOpType,
} from '#types/models';
import type { SyncedPrefs } from '#types/prefs';
import type { JSONValue } from '#types/report-spreadsheet';

import { hashString, stableStringify } from './plan-utils';
import type { ReportPlan } from './types';

type QueryDataEntity = {
  account: string | null;
  accountOffBudget: boolean;
  amount: number;
  category: string | null;
  categoryGroup: string | null;
  categoryGroupHidden: boolean;
  categoryHidden: boolean;
  categoryIncome?: boolean | null;
  date: string;
  payee: string | null;
  transferAccount: string | null;
};

type BudgetRow = {
  amount?: number;
  category?: string;
  month?: number;
};

type UncategorizedId = 'off_budget' | 'transfer' | 'other' | 'all';

type UncategorizedEntity = Pick<CategoryEntity, 'hidden' | 'id' | 'name'> & {
  categories?: UncategorizedEntity[];
  uncategorized_id?: UncategorizedId;
};

const balanceTypeMap = new Map<string, balanceTypeOpType>([
  ['Payment', 'totalDebts'],
  ['Expense', 'totalDebts'],
  ['Deposit', 'totalAssets'],
  ['Income', 'totalAssets'],
  ['Net', 'totalTotals'],
  ['Net Payment', 'netDebts'],
  ['Net Expense', 'netDebts'],
  ['Net Deposit', 'netAssets'],
  ['Net Income', 'netAssets'],
  ['Budgeted', 'totalBudgeted'],
]);

const dateRangeMap = new Map<string, number | string>([
  ['This week', 0],
  ['Last week', 1],
  ['This month', 0],
  ['Last month', 1],
  ['Last 30 days', 'last30Days'],
  ['Last 3 months', 3],
  ['Last 6 months', 6],
  ['Last 12 months', 12],
  ['Year to date', 'yearToDate'],
  ['Last year', 'lastYear'],
  ['Prior year to date', 'priorYearToDate'],
  ['All time', 'allTime'],
]);

const dateRangeType = new Map<string, string>([
  ['This week', 'Week'],
  ['Last week', 'Week'],
  ['This month', 'Month'],
  ['Last month', 'Month'],
  ['Last 30 days', 'Day'],
  ['Last 3 months', 'Month'],
  ['Last 6 months', 'Month'],
  ['Last 12 months', 'Month'],
  ['Year to date', 'Month'],
  ['Last year', 'Month'],
  ['Prior year to date', 'Month'],
  ['All time', 'Month'],
]);

const intervalFormat = new Map<string, string>([
  ['Daily', 'yy-MM-dd'],
  ['Weekly', 'yy-MM-dd'],
  ['Monthly', "MMM ''yy"],
  ['Yearly', 'yyyy'],
]);

const colorScale = [
  'var(--color-chartQual1)',
  'var(--color-chartQual2)',
  'var(--color-chartQual3)',
  'var(--color-chartQual4)',
  'var(--color-chartQual5)',
  'var(--color-chartQual6)',
  'var(--color-chartQual7)',
  'var(--color-chartQual8)',
  'var(--color-chartQual9)',
];

const uncategorizedCategory: UncategorizedEntity = {
  hidden: false,
  id: '',
  name: 'Uncategorized',
  uncategorized_id: 'other',
};
const transferCategory: UncategorizedEntity = {
  hidden: false,
  id: '',
  name: 'Transfers',
  uncategorized_id: 'transfer',
};
const offBudgetCategory: UncategorizedEntity = {
  hidden: false,
  id: '',
  name: 'Off budget',
  uncategorized_id: 'off_budget',
};
const uncategorizedGroup: UncategorizedEntity = {
  categories: [uncategorizedCategory, transferCategory, offBudgetCategory],
  hidden: false,
  id: 'uncategorized',
  name: 'Uncategorized & Off budget',
  uncategorized_id: 'all',
};

function validateRange(
  earliest: string,
  start: string,
  end: string,
): [string, string] {
  return [start < earliest ? earliest : start, end];
}

function getSpecificRange(
  offset: number,
  addNumber: number | null,
  type?: string,
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'],
) {
  const currentDay = monthUtils.currentDay();
  const currentWeek = monthUtils.currentWeek(firstDayOfWeekIdx);

  let dateStart = monthUtils.subMonths(currentDay, offset) + '-01';
  let dateEnd = monthUtils.getMonthEnd(
    monthUtils.addMonths(dateStart, addNumber === null ? offset : addNumber) +
      '-01',
  );

  if (type === 'Week') {
    dateStart = monthUtils.subWeeks(currentWeek, offset);
    dateEnd = monthUtils.getWeekEnd(
      monthUtils.addWeeks(dateStart, addNumber === null ? offset : addNumber),
      firstDayOfWeekIdx,
    );
  }

  return [dateStart, dateEnd] as const;
}

function getLiveRange({
  dateRange,
  earliestTransactionDate,
  firstDayOfWeekIdx,
  includeCurrentInterval,
  latestTransactionDate,
}: {
  dateRange: string;
  earliestTransactionDate: string;
  firstDayOfWeekIdx?: SyncedPrefs['firstDayOfWeekIdx'];
  includeCurrentInterval: boolean;
  latestTransactionDate: string;
}): [string, string] {
  const rangeName = dateRangeMap.get(dateRange);

  if (rangeName === 'yearToDate') {
    return validateRange(
      earliestTransactionDate,
      monthUtils.getYearStart(monthUtils.currentMonth()) + '-01',
      monthUtils.currentDay(),
    );
  }
  if (rangeName === 'lastMonth') {
    const previousMonth = monthUtils.subMonths(monthUtils.currentMonth(), 1);
    return validateRange(
      earliestTransactionDate,
      monthUtils.firstDayOfMonth(previousMonth),
      monthUtils.lastDayOfMonth(previousMonth),
    );
  }
  if (rangeName === 'lastYear') {
    return validateRange(
      earliestTransactionDate,
      monthUtils.getYearStart(monthUtils.prevYear(monthUtils.currentMonth())) +
        '-01',
      monthUtils.getYearEnd(monthUtils.prevYear(monthUtils.currentDate())) +
        '-31',
    );
  }
  if (rangeName === 'priorYearToDate') {
    return validateRange(
      earliestTransactionDate,
      monthUtils.getYearStart(monthUtils.prevYear(monthUtils.currentMonth())) +
        '-01',
      monthUtils.prevYear(monthUtils.currentDate(), 'yyyy-MM-dd'),
    );
  }
  if (rangeName === 'last30Days') {
    return validateRange(
      earliestTransactionDate,
      monthUtils.subDays(monthUtils.currentDay(), 29),
      monthUtils.currentDay(),
    );
  }
  if (rangeName === 'allTime') {
    return [earliestTransactionDate, latestTransactionDate];
  }
  if (typeof rangeName === 'number') {
    return getSpecificRange(
      rangeName,
      ['This month', 'This week'].includes(dateRange)
        ? null
        : rangeName - (includeCurrentInterval ? 0 : 1),
      dateRangeType.get(dateRange),
      firstDayOfWeekIdx,
    );
  }

  return [earliestTransactionDate, latestTransactionDate];
}

function getReportDates({
  earliestTransactionDate,
  firstDayOfWeekIdx,
  latestTransactionDate,
  report,
}: {
  earliestTransactionDate: string | null;
  firstDayOfWeekIdx: SyncedPrefs['firstDayOfWeekIdx'];
  latestTransactionDate: string | null;
  report: CustomReportEntity;
}) {
  if (report.isDateStatic) {
    return {
      endDate: report.endDate,
      startDate: report.startDate,
    };
  }

  const fallbackDay = monthUtils.currentDay();
  const [startDate, endDate] = getLiveRange({
    dateRange: report.dateRange,
    earliestTransactionDate: earliestTransactionDate ?? fallbackDay,
    firstDayOfWeekIdx,
    includeCurrentInterval: report.includeCurrentInterval,
    latestTransactionDate: latestTransactionDate ?? fallbackDay,
  });
  return {
    endDate: endDate || report.endDate,
    startDate: startDate || report.startDate,
  };
}

function getIntervals({
  endDate,
  firstDayOfWeekIdx,
  interval,
  startDate,
}: {
  endDate: string;
  firstDayOfWeekIdx: SyncedPrefs['firstDayOfWeekIdx'];
  interval: string;
  startDate: string;
}) {
  if (interval === 'Weekly') {
    return monthUtils.weekRangeInclusive(startDate, endDate, firstDayOfWeekIdx);
  }
  if (interval === 'Daily') {
    return monthUtils.dayRangeInclusive(startDate, endDate);
  }
  if (interval === 'Yearly') {
    return monthUtils.yearRangeInclusive(startDate, endDate);
  }
  return monthUtils.rangeInclusive(startDate, endDate);
}

function conditionsToFilters(conditions?: RuleConditionEntity[]) {
  return conditionsToAQL((conditions ?? []).filter(cond => !cond.customName))
    .filters;
}

function getIntervalGroup(interval: string) {
  if (interval === 'Monthly') {
    return { $month: '$date' };
  }
  if (interval === 'Yearly') {
    return { $year: '$date' };
  }
  return { $day: '$date' };
}

function getIntervalFilter(interval: string) {
  if (interval === 'Weekly') {
    return '$day';
  }
  if (interval === 'Daily') {
    return '$day';
  }
  if (interval === 'Yearly') {
    return '$year';
  }
  return '$month';
}

function makeTransactionQuery({
  amountOp,
  conditions,
  conditionsOp,
  endDate,
  interval,
  startDate,
}: {
  amountOp: '$gt' | '$lt';
  conditions: RuleConditionEntity[] | undefined;
  conditionsOp: 'and' | 'or';
  endDate: string;
  interval: string;
  startDate: string;
}) {
  const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';
  const intervalGroup = getIntervalGroup(interval);
  const intervalFilter = getIntervalFilter(interval);

  return q('transactions')
    .filter({
      [conditionsOpKey]: conditionsToFilters(conditions),
    })
    .filter({
      $and: [
        { date: { $transform: intervalFilter, $gte: startDate } },
        { date: { $transform: intervalFilter, $lte: endDate } },
      ],
    })
    .filter({ amount: { [amountOp]: 0 } })
    .groupBy([
      intervalGroup,
      { $id: '$account' },
      { $id: '$payee' },
      { $id: '$category' },
      { $id: '$payee.transfer_acct.id' },
    ])
    .select([
      { date: intervalGroup },
      { category: { $id: '$category.id' } },
      { categoryHidden: { $id: '$category.hidden' } },
      { categoryIncome: { $id: '$category.is_income' } },
      { categoryGroup: { $id: '$category.group.id' } },
      { categoryGroupHidden: { $id: '$category.group.hidden' } },
      { account: { $id: '$account.id' } },
      { accountOffBudget: { $id: '$account.offbudget' } },
      { payee: { $id: '$payee.id' } },
      { transferAccount: { $id: '$payee.transfer_acct.id' } },
      { amount: { $sum: '$amount' } },
    ])
    .serialize();
}

function makeBudgetQuery({
  budgetType,
  endDate,
  startDate,
}: {
  budgetType: 'envelope' | 'tracking';
  endDate: string;
  startDate: string;
}) {
  const table = budgetType === 'tracking' ? 'reflect_budgets' : 'zero_budgets';
  return q(table)
    .filter({
      $and: [
        {
          month: {
            $gte: Number(monthUtils.getMonth(startDate).replace('-', '')),
          },
        },
        {
          month: {
            $lte: Number(monthUtils.getMonth(endDate).replace('-', '')),
          },
        },
      ],
    })
    .groupBy(['month', 'category'])
    .select(['month', 'category', { amount: { $sum: '$amount' } }])
    .serialize();
}

function sortCategories(
  categories: CategoryEntity[],
  categoryGroups: CategoryGroupEntity[],
) {
  return [...categories].sort((a, b) => {
    const groupA = categoryGroups.find(group => group.id === a.group);
    const groupB = categoryGroups.find(group => group.id === b.group);

    return groupA && groupB
      ? Number(groupA.is_income) - Number(groupB.is_income) ||
          (groupA.sort_order ?? 0) - (groupB.sort_order ?? 0) ||
          (a.sort_order ?? 0) - (b.sort_order ?? 0)
      : 0;
  });
}

function categoryLists(categories: {
  grouped: CategoryGroupEntity[];
  list: CategoryEntity[];
}) {
  const categoryList: UncategorizedEntity[] = [
    ...sortCategories(categories.list, categories.grouped),
    uncategorizedCategory,
    offBudgetCategory,
    transferCategory,
  ];
  const categoryGroup: UncategorizedEntity[] = [
    ...categories.grouped.map(group => ({
      categories: group.categories as UncategorizedEntity[] | undefined,
      hidden: group.hidden,
      id: group.id,
      name: group.name,
    })),
    uncategorizedGroup,
  ];
  return [categoryList, categoryGroup] as const;
}

function groupBySelections({
  accounts,
  categoryGroup,
  categoryList,
  groupBy,
  payees,
}: {
  accounts: AccountEntity[];
  categoryGroup: UncategorizedEntity[];
  categoryList: UncategorizedEntity[];
  groupBy: string;
  payees: PayeeEntity[];
}): [
  UncategorizedEntity[],
  'account' | 'category' | 'categoryGroup' | 'payee',
] {
  if (groupBy === 'Category' || groupBy === 'Interval') {
    return [categoryList, 'category'];
  }
  if (groupBy === 'Group' || groupBy === 'CategoryGroup') {
    return [categoryGroup, 'categoryGroup'];
  }
  if (groupBy === 'Payee') {
    return [
      payees.map(payee => ({
        hidden: false,
        id: payee.id,
        name: payee.name,
      })),
      'payee',
    ];
  }
  if (groupBy === 'Account') {
    return [
      accounts.map(account => ({
        hidden: false,
        id: account.id,
        name: account.name,
      })),
      'account',
    ];
  }

  return [[], 'category'];
}

function filterHiddenItems({
  data,
  groupByCategory,
  item,
  showHiddenCategories,
  showOffBudget,
  showUncategorized,
}: {
  data: QueryDataEntity[];
  groupByCategory?: boolean;
  item: UncategorizedEntity;
  showHiddenCategories?: boolean;
  showOffBudget?: boolean;
  showUncategorized?: boolean;
}) {
  const visible = data
    .filter(
      row =>
        showHiddenCategories ||
        (row.categoryHidden === false && row.categoryGroupHidden === false),
    )
    .filter(row => showOffBudget || row.accountOffBudget === false)
    .filter(
      row =>
        showUncategorized ||
        row.category !== null ||
        row.accountOffBudget === true,
    );

  return visible.filter(row => {
    if (!groupByCategory) {
      return true;
    }

    const hasCategory = Boolean(row.category);
    const isOffBudget = row.accountOffBudget;
    const isTransfer = Boolean(row.transferAccount);

    if (hasCategory && !isOffBudget) {
      return item.uncategorized_id == null;
    }

    switch (item.uncategorized_id) {
      case 'off_budget':
        return isOffBudget;
      case 'transfer':
        return isTransfer && !isOffBudget;
      case 'other':
        return !isOffBudget && !isTransfer;
      case 'all':
        return true;
      default:
        return false;
    }
  });
}

function recalculate({
  assets,
  debts,
  endDate,
  groupByLabel,
  intervals,
  item,
  showHiddenCategories,
  showOffBudget,
  showUncategorized,
  startDate,
}: {
  assets: QueryDataEntity[];
  debts: QueryDataEntity[];
  endDate: string;
  groupByLabel: 'account' | 'category' | 'categoryGroup' | 'payee';
  intervals: string[];
  item: UncategorizedEntity;
  showHiddenCategories?: boolean;
  showOffBudget?: boolean;
  showUncategorized?: boolean;
  startDate: string;
}): GroupedEntity {
  let totalAssets = 0;
  let totalDebts = 0;
  const groupsByCategory =
    groupByLabel === 'category' || groupByLabel === 'categoryGroup';

  const intervalData = intervals.reduce(
    (rows: IntervalEntity[], intervalItem, index) => {
      const last = rows.length === 0 ? null : rows[rows.length - 1];
      const intervalAssets = filterHiddenItems({
        data: assets,
        groupByCategory: groupsByCategory,
        item,
        showHiddenCategories,
        showOffBudget,
        showUncategorized,
      })
        .filter(
          asset =>
            asset.date === intervalItem &&
            (asset[groupByLabel] === (item.id || null) ||
              (item.uncategorized_id && groupsByCategory)),
        )
        .reduce((sum, asset) => sum + asset.amount, 0);
      totalAssets += intervalAssets;

      const intervalDebts = filterHiddenItems({
        data: debts,
        groupByCategory: groupsByCategory,
        item,
        showHiddenCategories,
        showOffBudget,
        showUncategorized,
      })
        .filter(
          debt =>
            debt.date === intervalItem &&
            (debt[groupByLabel] === (item.id || null) ||
              (item.uncategorized_id && groupsByCategory)),
        )
        .reduce((sum, debt) => sum + debt.amount, 0);
      totalDebts += intervalDebts;

      const intervalTotals = intervalAssets + intervalDebts;
      rows.push({
        change: last ? intervalTotals - last.totalTotals : 0,
        date: intervalItem,
        intervalEndDate:
          index + 1 === intervals.length
            ? endDate
            : monthUtils.subDays(intervals[index + 1], 1),
        intervalStartDate: index === 0 ? startDate : intervalItem,
        netAssets: intervalTotals > 0 ? intervalTotals : 0,
        netDebts: intervalTotals < 0 ? intervalTotals : 0,
        totalAssets: intervalAssets,
        totalBudgeted: intervalTotals,
        totalDebts: intervalDebts,
        totalTotals: intervalTotals,
      });
      return rows;
    },
    [],
  );
  const totalTotals = totalAssets + totalDebts;

  return {
    id: item.id || '',
    intervalData,
    name: item.name,
    netAssets: totalTotals > 0 ? totalTotals : 0,
    netDebts: totalTotals < 0 ? totalTotals : 0,
    totalAssets,
    totalBudgeted: totalTotals,
    totalDebts,
    totalTotals,
    ...(item.uncategorized_id
      ? { uncategorizedId: item.uncategorized_id }
      : {}),
  };
}

function filterEmptyRows({
  balanceTypeOp = 'totalDebts',
  data,
  showEmpty,
}: {
  balanceTypeOp?: balanceTypeOpType;
  data: GroupedEntity;
  showEmpty: boolean;
}) {
  if (showEmpty) {
    return true;
  }

  if (balanceTypeOp === 'totalTotals' || balanceTypeOp === 'totalBudgeted') {
    return (
      data.totalDebts !== 0 ||
      data.totalAssets !== 0 ||
      data[balanceTypeOp] !== 0
    );
  }
  return data[balanceTypeOp] !== 0;
}

const reverseSort: Partial<Record<sortByOpType, sortByOpType>> = {
  asc: 'desc',
  desc: 'asc',
};

function sortData({
  balanceTypeOp,
  sortByOp,
}: {
  balanceTypeOp?: balanceTypeOpType;
  sortByOp?: sortByOpType;
}) {
  if (!balanceTypeOp || !sortByOp) {
    return () => 0;
  }

  const finalSortBy = ['totalDebts', 'netDebts'].includes(balanceTypeOp)
    ? (reverseSort[sortByOp] ?? sortByOp)
    : sortByOp;

  return (a: GroupedEntity, b: GroupedEntity) => {
    if (finalSortBy === 'asc') {
      return a[balanceTypeOp] - b[balanceTypeOp];
    }
    if (finalSortBy === 'desc') {
      return b[balanceTypeOp] - a[balanceTypeOp];
    }
    if (finalSortBy === 'name') {
      return (a.name ?? '').localeCompare(b.name ?? '');
    }
    return 0;
  };
}

function isEmptyForMetric(interval: IntervalEntity, metric: balanceTypeOpType) {
  return interval[metric] === 0;
}

function determineIntervalRange(
  data: GroupedEntity[],
  intervalData: IntervalEntity[],
  trimIntervals: boolean,
  balanceTypeOp: balanceTypeOpType,
) {
  if (!trimIntervals || intervalData.length === 0) {
    return { endIndex: intervalData.length - 1, startIndex: 0 };
  }

  let globalStartIndex = intervalData.length;
  let globalEndIndex = -1;

  for (const item of data) {
    const startIndex = item.intervalData.findIndex(
      interval => !isEmptyForMetric(interval, balanceTypeOp),
    );
    if (startIndex !== -1) {
      globalStartIndex = Math.min(globalStartIndex, startIndex);

      let endIndex = item.intervalData.length - 1;
      while (
        endIndex >= 0 &&
        isEmptyForMetric(item.intervalData[endIndex], balanceTypeOp)
      ) {
        endIndex -= 1;
      }
      globalEndIndex = Math.max(globalEndIndex, endIndex);
    }
  }

  const mainStartIndex = intervalData.findIndex(
    interval => !isEmptyForMetric(interval, balanceTypeOp),
  );
  if (mainStartIndex !== -1) {
    globalStartIndex = Math.min(globalStartIndex, mainStartIndex);
    let mainEndIndex = intervalData.length - 1;
    while (
      mainEndIndex >= 0 &&
      isEmptyForMetric(intervalData[mainEndIndex], balanceTypeOp)
    ) {
      mainEndIndex -= 1;
    }
    globalEndIndex = Math.max(globalEndIndex, mainEndIndex);
  }

  return globalStartIndex === intervalData.length || globalEndIndex === -1
    ? { endIndex: -1, startIndex: 0 }
    : { endIndex: globalEndIndex, startIndex: globalStartIndex };
}

function trimIntervalDataToRange(
  data: IntervalEntity[],
  startIndex: number,
  endIndex: number,
) {
  if (startIndex > endIndex || startIndex < 0 || endIndex >= data.length) {
    return [];
  }
  return data.slice(startIndex, endIndex + 1);
}

function trimIntervalsToRange(
  data: GroupedEntity[],
  startIndex: number,
  endIndex: number,
) {
  for (const item of data) {
    item.intervalData =
      startIndex > endIndex ||
      startIndex < 0 ||
      endIndex >= item.intervalData.length
        ? []
        : item.intervalData.slice(startIndex, endIndex + 1);
  }
}

function trimGroupedDataIntervals(
  groupedData: GroupedEntity[],
  startIndex: number,
  endIndex: number,
) {
  for (const group of groupedData) {
    group.intervalData =
      startIndex > endIndex ||
      startIndex < 0 ||
      endIndex >= group.intervalData.length
        ? []
        : group.intervalData.slice(startIndex, endIndex + 1);

    for (const category of group.categories ?? []) {
      category.intervalData =
        startIndex > endIndex ||
        startIndex < 0 ||
        endIndex >= category.intervalData.length
          ? []
          : category.intervalData.slice(startIndex, endIndex + 1);
    }
  }
}

function calculateLegend({
  balanceTypeOp,
  calcDataFiltered,
  graphType,
  groupBy,
  intervalData,
}: {
  balanceTypeOp: balanceTypeOpType;
  calcDataFiltered: GroupedEntity[];
  graphType?: string;
  groupBy: string;
  intervalData: IntervalEntity[];
}): LegendEntity[] {
  const chooseData =
    groupBy === 'Interval'
      ? intervalData.map(row => ({ data: row, id: null, name: row.date }))
      : calcDataFiltered.map(row => ({
          data: row,
          id: row.id,
          name: row.name,
        }));

  return chooseData.map((item, index) => {
    let color = colorScale[index % colorScale.length];
    if (graphType !== 'DonutGraph' && groupBy === 'Interval') {
      if (balanceTypeOp === 'totalDebts' || balanceTypeOp === 'netDebts') {
        color = 'var(--color-reportsNumberNegative)';
      } else if (
        balanceTypeOp === 'totalTotals' ||
        balanceTypeOp === 'totalBudgeted'
      ) {
        const total =
          balanceTypeOp === 'totalBudgeted'
            ? item.data.totalBudgeted
            : item.data.totalTotals;
        color =
          total < 0
            ? 'var(--color-reportsNumberNegative)'
            : 'var(--color-reportsNumberPositive)';
      } else if (
        balanceTypeOp === 'totalAssets' ||
        balanceTypeOp === 'netAssets'
      ) {
        color = 'var(--color-reportsNumberPositive)';
      } else {
        color = 'var(--color-reportsChartFill)';
      }
    }

    return {
      color,
      dataKey: item.id || item.name || '',
      id: item.id || '',
      name: item.name || '',
      ...('uncategorizedId' in item.data && item.data.uncategorizedId
        ? { uncategorizedId: item.data.uncategorizedId }
        : {}),
    };
  });
}

function normalizeBudgetData({
  budgetRows,
  categories,
  categoryGroups,
  interval,
}: {
  budgetRows: BudgetRow[];
  categories: CategoryEntity[];
  categoryGroups: CategoryGroupEntity[];
  interval: string;
}) {
  const categoryById = new Map(categories.map(cat => [cat.id, cat] as const));
  const groupById = new Map(
    categoryGroups.map(group => [group.id, group] as const),
  );
  const assets: QueryDataEntity[] = [];
  const debts: QueryDataEntity[] = [];

  for (const row of budgetRows) {
    const category = row.category ? categoryById.get(row.category) : undefined;
    if (!category || category.is_income) {
      continue;
    }
    const amount = row.amount ?? 0;
    if (amount === 0) {
      continue;
    }
    const month = String(row.month ?? '');
    const date =
      interval === 'Yearly'
        ? month.slice(0, 4)
        : `${month.slice(0, 4)}-${month.slice(4, 6)}`;
    const group = category.group ? groupById.get(category.group) : undefined;
    const entry: QueryDataEntity = {
      account: '',
      accountOffBudget: false,
      amount,
      category: category.id,
      categoryGroup: category.group ?? '',
      categoryGroupHidden: group?.hidden ?? false,
      categoryHidden: category.hidden ?? false,
      date,
      payee: '',
      transferAccount: '',
    };

    if (amount > 0) {
      assets.push(entry);
    } else {
      debts.push(entry);
    }
  }

  return { assets, debts };
}

function normalizeTransactionRows({
  firstDayOfWeekIdx,
  interval,
  rows,
}: {
  firstDayOfWeekIdx: SyncedPrefs['firstDayOfWeekIdx'];
  interval: string;
  rows: QueryDataEntity[];
}) {
  if (interval !== 'Weekly') {
    return rows;
  }

  return rows.map(row => ({
    ...row,
    date: monthUtils.weekFromDate(row.date, firstDayOfWeekIdx),
  }));
}

function calculateGroupedData({
  assets,
  balanceTypeOp,
  categoryGroup,
  debts,
  endDate,
  intervals,
  showEmpty,
  showHiddenCategories,
  showOffBudget,
  showUncategorized,
  sortByOp,
  startDate,
  trimIntervals,
}: {
  assets: QueryDataEntity[];
  balanceTypeOp: balanceTypeOpType;
  categoryGroup: UncategorizedEntity[];
  debts: QueryDataEntity[];
  endDate: string;
  intervals: string[];
  showEmpty: boolean;
  showHiddenCategories: boolean;
  showOffBudget: boolean;
  showUncategorized: boolean;
  sortByOp?: sortByOpType;
  startDate: string;
  trimIntervals: boolean;
}) {
  const groupedData = categoryGroup.map(group => {
    const grouped = recalculate({
      assets,
      debts,
      endDate,
      groupByLabel: 'categoryGroup',
      intervals,
      item: group,
      showHiddenCategories,
      showOffBudget,
      showUncategorized,
      startDate,
    });
    const categories = (group.categories ?? [])
      .map(category =>
        recalculate({
          assets,
          debts,
          endDate,
          groupByLabel: 'category',
          intervals,
          item: category,
          showHiddenCategories,
          showOffBudget,
          showUncategorized,
          startDate,
        }),
      )
      .filter(row => filterEmptyRows({ balanceTypeOp, data: row, showEmpty }));

    return {
      ...grouped,
      ...(categories.length > 0 ? { categories } : {}),
    };
  });
  const groupedDataFiltered = groupedData.filter(row =>
    filterEmptyRows({ balanceTypeOp, data: row, showEmpty }),
  );
  const allGroupsForTrimming = groupedDataFiltered.flatMap(group => [
    group,
    ...(group.categories ?? []),
  ]);
  const { startIndex, endIndex } = determineIntervalRange(
    allGroupsForTrimming,
    groupedDataFiltered[0]?.intervalData ?? [],
    trimIntervals,
    balanceTypeOp,
  );
  trimGroupedDataIntervals(groupedDataFiltered, startIndex, endIndex);

  return [...groupedDataFiltered]
    .sort(sortData({ balanceTypeOp, sortByOp }))
    .map(group => ({
      ...group,
      categories: [...(group.categories ?? [])].sort(
        sortData({ balanceTypeOp, sortByOp }),
      ),
    }));
}

function calculateCustomReportData({
  accounts,
  assets: rawAssets,
  budgetRows,
  budgetType,
  categories,
  categoryGroups,
  debts: rawDebts,
  endDate,
  firstDayOfWeekIdx,
  intervals,
  payees,
  report,
  startDate,
}: {
  accounts: AccountEntity[];
  assets: QueryDataEntity[];
  budgetRows: BudgetRow[];
  budgetType: 'envelope' | 'tracking';
  categories: CategoryEntity[];
  categoryGroups: CategoryGroupEntity[];
  debts: QueryDataEntity[];
  endDate: string;
  firstDayOfWeekIdx: SyncedPrefs['firstDayOfWeekIdx'];
  intervals: string[];
  payees: PayeeEntity[];
  report: CustomReportEntity;
  startDate: string;
}): JSONValue {
  const balanceTypeOp = balanceTypeMap.get(report.balanceType) ?? 'totalDebts';
  const [categoryList, categoryGroup] = categoryLists({
    grouped: categoryGroups.map(group => ({
      ...group,
      categories: categories.filter(category => category.group === group.id),
    })),
    list: categories,
  });
  const [groupByList, groupByLabel] = groupBySelections({
    accounts,
    categoryGroup,
    categoryList,
    groupBy: report.groupBy,
    payees,
  });

  if (groupByList.length === 0) {
    return {
      data: [],
      endDate,
      groupedData: [],
      intervalData: [],
      intervalsCount: intervals.length,
      legend: [],
      netAssets: 0,
      netDebts: 0,
      startDate,
      totalAssets: 0,
      totalBudgeted: 0,
      totalDebts: 0,
      totalTotals: 0,
    };
  }

  const budgetData =
    balanceTypeOp === 'totalBudgeted'
      ? normalizeBudgetData({
          budgetRows,
          categories,
          categoryGroups,
          interval: report.interval,
        })
      : null;
  const assets =
    budgetData?.assets ??
    normalizeTransactionRows({
      firstDayOfWeekIdx,
      interval: report.interval,
      rows: rawAssets,
    });
  const debts =
    budgetData?.debts ??
    normalizeTransactionRows({
      firstDayOfWeekIdx,
      interval: report.interval,
      rows: rawDebts,
    });

  let totalAssets = 0;
  let totalDebts = 0;
  let netAssets = 0;
  let netDebts = 0;
  const groupsByCategory =
    groupByLabel === 'category' || groupByLabel === 'categoryGroup';
  const intervalData = intervals.map((intervalItem, index) => {
    let perIntervalAssets = 0;
    let perIntervalDebts = 0;
    let perIntervalTotals = 0;
    const stacked: Record<string, number> = {};

    for (const item of groupByList) {
      let stackAmounts = 0;
      const intervalAssets = filterHiddenItems({
        data: assets,
        groupByCategory: groupsByCategory,
        item,
        showHiddenCategories: report.showHiddenCategories,
        showOffBudget: report.showOffBudget,
        showUncategorized: report.showUncategorized,
      })
        .filter(
          asset =>
            asset.date === intervalItem &&
            (asset[groupByLabel] === (item.id || null) ||
              (item.uncategorized_id && groupsByCategory)),
        )
        .reduce((sum, asset) => sum + asset.amount, 0);
      perIntervalAssets += intervalAssets;

      const intervalDebts = filterHiddenItems({
        data: debts,
        groupByCategory: groupsByCategory,
        item,
        showHiddenCategories: report.showHiddenCategories,
        showOffBudget: report.showOffBudget,
        showUncategorized: report.showUncategorized,
      })
        .filter(
          debt =>
            debt.date === intervalItem &&
            (debt[groupByLabel] === (item.id || null) ||
              (item.uncategorized_id && groupsByCategory)),
        )
        .reduce((sum, debt) => sum + debt.amount, 0);
      perIntervalDebts += intervalDebts;

      const netAmounts = intervalAssets + intervalDebts;
      if (balanceTypeOp === 'totalAssets') {
        stackAmounts += intervalAssets;
      } else if (balanceTypeOp === 'totalDebts') {
        stackAmounts += Math.abs(intervalDebts);
      } else if (balanceTypeOp === 'netAssets') {
        stackAmounts += netAmounts > 0 ? netAmounts : 0;
      } else if (balanceTypeOp === 'netDebts') {
        stackAmounts = netAmounts < 0 ? Math.abs(netAmounts) : 0;
      } else {
        stackAmounts += netAmounts;
      }

      stacked[item.id || item.name] = stackAmounts;
      perIntervalTotals += netAmounts;
    }

    const perIntervalNetAssets = perIntervalTotals > 0 ? perIntervalTotals : 0;
    const perIntervalNetDebts = perIntervalTotals < 0 ? perIntervalTotals : 0;
    totalAssets += perIntervalAssets;
    totalDebts += perIntervalDebts;
    netAssets += perIntervalNetAssets;
    netDebts += perIntervalNetDebts;

    return {
      date: d.format(
        d.parseISO(intervalItem),
        intervalFormat.get(report.interval) ?? '',
      ),
      ...stacked,
      intervalEndDate:
        index + 1 === intervals.length
          ? endDate
          : monthUtils.subDays(intervals[index + 1], 1),
      intervalStartDate: index === 0 ? startDate : intervalItem,
      netAssets: perIntervalNetAssets,
      netDebts: perIntervalNetDebts,
      totalAssets: perIntervalAssets,
      totalBudgeted: perIntervalTotals,
      totalDebts: perIntervalDebts,
      totalTotals: perIntervalTotals,
    };
  });
  const calcData = groupByList.map(item =>
    recalculate({
      assets,
      debts,
      endDate,
      groupByLabel,
      intervals,
      item,
      showHiddenCategories: report.showHiddenCategories,
      showOffBudget: report.showOffBudget,
      showUncategorized: report.showUncategorized,
      startDate,
    }),
  );
  const calcDataFiltered = calcData.filter(row =>
    filterEmptyRows({
      balanceTypeOp,
      data: row,
      showEmpty: report.showEmpty,
    }),
  );
  const { startIndex, endIndex } = determineIntervalRange(
    calcDataFiltered,
    intervalData,
    report.trimIntervals,
    balanceTypeOp,
  );
  const trimmedIntervalData = report.trimIntervals
    ? trimIntervalDataToRange(intervalData, startIndex, endIndex)
    : intervalData;
  if (report.trimIntervals) {
    trimIntervalsToRange(calcDataFiltered, startIndex, endIndex);
  }
  const sortedCalcDataFiltered = [...calcDataFiltered].sort(
    sortData({ balanceTypeOp, sortByOp: report.sortBy }),
  );
  const groupedData = calculateGroupedData({
    assets,
    balanceTypeOp,
    categoryGroup,
    debts,
    endDate,
    intervals,
    showEmpty: report.showEmpty,
    showHiddenCategories: report.showHiddenCategories,
    showOffBudget: report.showOffBudget,
    showUncategorized: report.showUncategorized,
    sortByOp: report.sortBy,
    startDate,
    trimIntervals: report.trimIntervals,
  });

  return {
    data: sortedCalcDataFiltered,
    endDate,
    groupedData,
    intervalData: trimmedIntervalData,
    intervalsCount: intervals.length,
    legend: calculateLegend({
      balanceTypeOp,
      calcDataFiltered: sortedCalcDataFiltered,
      graphType: report.graphType,
      groupBy: report.groupBy,
      intervalData: trimmedIntervalData,
    }),
    netAssets,
    netDebts,
    startDate,
    totalAssets,
    totalBudgeted: totalAssets + totalDebts,
    totalDebts,
    totalTotals: totalAssets + totalDebts,
  } as unknown as JSONValue;
}

export function createCustomReportPlan({
  budgetType,
  earliestTransactionDate,
  firstDayOfWeekIdx,
  latestTransactionDate,
  report,
  sheet,
  widget,
}: {
  budgetType: 'envelope' | 'tracking';
  earliestTransactionDate: string | null;
  firstDayOfWeekIdx: SyncedPrefs['firstDayOfWeekIdx'];
  latestTransactionDate: string | null;
  report: CustomReportEntity;
  sheet: Spreadsheet;
  widget: CustomReportWidget;
}): ReportPlan {
  const { endDate, startDate } = getReportDates({
    earliestTransactionDate,
    firstDayOfWeekIdx,
    latestTransactionDate,
    report,
  });
  const intervals = getIntervals({
    endDate,
    firstDayOfWeekIdx,
    interval: report.interval,
    startDate,
  });
  const balanceTypeOp = balanceTypeMap.get(report.balanceType) ?? 'totalDebts';
  const planHash = hashString(
    stableStringify({
      budgetType,
      endDate,
      firstDayOfWeekIdx,
      report,
      startDate,
      type: widget.type,
    }),
  );
  const sheetName = `report:${widget.id}:${planHash}`;
  const categoriesCell = resolveName(sheetName, 'categories-query');
  const categoryGroupsCell = resolveName(sheetName, 'category-groups-query');
  const accountsCell = resolveName(sheetName, 'accounts-query');
  const payeesCell = resolveName(sheetName, 'payees-query');
  const queryCells = [
    categoriesCell,
    categoryGroupsCell,
    accountsCell,
    payeesCell,
  ];

  sheet.createQuery(
    sheetName,
    'categories-query',
    q('categories')
      .select(['id', 'name', 'is_income', 'hidden', 'group', 'sort_order'])
      .serialize(),
  );
  sheet.createQuery(
    sheetName,
    'category-groups-query',
    q('category_groups')
      .select(['id', 'name', 'is_income', 'hidden', 'sort_order'])
      .serialize(),
  );
  sheet.createQuery(
    sheetName,
    'accounts-query',
    q('accounts')
      .filter({ closed: false })
      .select(['id', 'name', 'sort_order'])
      .orderBy('sort_order')
      .orderBy('name')
      .serialize(),
  );
  sheet.createQuery(
    sheetName,
    'payees-query',
    q('payees')
      .select(['id', 'name', 'transfer_acct'])
      .orderBy('name')
      .serialize(),
  );

  if (balanceTypeOp === 'totalBudgeted') {
    const budgetCell = resolveName(sheetName, 'budget-query');
    queryCells.push(budgetCell);
    sheet.createQuery(
      sheetName,
      'budget-query',
      makeBudgetQuery({ budgetType, endDate, startDate }),
    );
  } else {
    const assetsCell = resolveName(sheetName, 'assets-query');
    const debtsCell = resolveName(sheetName, 'debts-query');
    queryCells.push(assetsCell, debtsCell);
    sheet.createQuery(
      sheetName,
      'assets-query',
      makeTransactionQuery({
        amountOp: '$gt',
        conditions: report.conditions,
        conditionsOp: report.conditionsOp,
        endDate,
        interval: report.interval,
        startDate,
      }),
    );
    sheet.createQuery(
      sheetName,
      'debts-query',
      makeTransactionQuery({
        amountOp: '$lt',
        conditions: report.conditions,
        conditionsOp: report.conditionsOp,
        endDate,
        interval: report.interval,
        startDate,
      }),
    );
  }

  sheet.createDynamic(sheetName, 'data', {
    dependencies: queryCells,
    initialValue: null,
    run: (...values: unknown[]) => {
      const categories = Array.isArray(values[0])
        ? (values[0] as CategoryEntity[])
        : [];
      const categoryGroups = Array.isArray(values[1])
        ? (values[1] as CategoryGroupEntity[])
        : [];
      const accounts = Array.isArray(values[2])
        ? (values[2] as AccountEntity[])
        : [];
      const payees = Array.isArray(values[3])
        ? (values[3] as PayeeEntity[])
        : [];
      const budgetRows =
        balanceTypeOp === 'totalBudgeted' && Array.isArray(values[4])
          ? (values[4] as BudgetRow[])
          : [];
      const assets =
        balanceTypeOp === 'totalBudgeted' || !Array.isArray(values[4])
          ? []
          : (values[4] as QueryDataEntity[]);
      const debts =
        balanceTypeOp === 'totalBudgeted' || !Array.isArray(values[5])
          ? []
          : (values[5] as QueryDataEntity[]);

      return calculateCustomReportData({
        accounts,
        assets,
        budgetRows,
        budgetType,
        categories,
        categoryGroups,
        debts,
        endDate,
        firstDayOfWeekIdx,
        intervals,
        payees,
        report,
        startDate,
      });
    },
  });

  return {
    queryCells,
    rootName: resolveName(sheetName, 'data'),
    sheetName,
    widgetId: widget.id,
  };
}
