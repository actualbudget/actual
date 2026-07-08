import type { Spreadsheet } from '#server/spreadsheet/spreadsheet';
import { resolveName } from '#server/spreadsheet/util';
import { conditionsToAQL } from '#server/transactions/transaction-rules';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import type {
  CategoryEntity,
  CategoryGroupEntity,
  RuleConditionEntity,
  SpendingAverageRange,
  SpendingWidget,
} from '#types/models';
import type { JSONValue } from '#types/report-spreadsheet';

import { calculateTimeRange, hashString, stableStringify } from './plan-utils';
import type { ReportPlan } from './types';

type SpendingRow = {
  accountOffBudget?: boolean;
  amount?: number;
  categoryIncome?: boolean | null;
  date?: string;
};

type BudgetRow = {
  amount?: number;
  category?: string;
};

type ResolvedSpendingAverageRange = {
  endMonth: string | null;
  months: string[];
  startMonth: string | null;
};

const defaultAverageRange: SpendingAverageRange = {
  mode: 'last-n-months',
  months: 3,
};

function normalizeAverageRange(
  averageRange?: SpendingAverageRange,
): SpendingAverageRange {
  if (!averageRange) {
    return defaultAverageRange;
  }

  if (
    averageRange.mode === 'last-n-months' &&
    ![3, 6, 12].includes(averageRange.months)
  ) {
    return defaultAverageRange;
  }

  return averageRange;
}

function resolveAverageRange({
  averageRange,
  compare,
  earliestMonth,
}: {
  averageRange?: SpendingAverageRange;
  compare: string;
  earliestMonth: string | null;
}): ResolvedSpendingAverageRange {
  const normalizedRange = normalizeAverageRange(averageRange);
  const endMonth = monthUtils.subMonths(compare, 1);
  let startMonth: string | null;

  switch (normalizedRange.mode) {
    case 'last-n-months':
      startMonth = monthUtils.subMonths(compare, normalizedRange.months);
      break;
    case 'year-to-date':
      startMonth = `${monthUtils.getYear(compare)}-01`;
      break;
    case 'all-time':
      startMonth = earliestMonth;
      break;
    default:
      startMonth = monthUtils.subMonths(compare, 3);
      break;
  }

  if (!startMonth || startMonth > endMonth) {
    return {
      endMonth: null,
      months: [],
      startMonth: null,
    };
  }

  return {
    endMonth,
    months: monthUtils.rangeInclusive(startMonth, endMonth),
    startMonth,
  };
}

function calculateSpendingTimeRange(meta: SpendingWidget['meta']) {
  const compare = meta?.compare;
  const compareTo = meta?.compareTo;
  const isLive = meta?.isLive ?? true;
  const mode = meta?.mode ?? 'single-month';

  if (['budget', 'average'].includes(mode) && isLive) {
    const month = compare ?? monthUtils.currentMonth();
    return [month, month] as const;
  }

  if (mode === 'single-month' && isLive && compare) {
    return [compare, compareTo ?? monthUtils.subMonths(compare, 1)] as const;
  }

  const [start, end] = calculateTimeRange(
    {
      start: compare,
      end: compareTo,
      mode: isLive ? 'sliding-window' : 'static',
    },
    {
      start: monthUtils.currentMonth(),
      end: monthUtils.subMonths(monthUtils.currentMonth(), 1),
      mode: 'sliding-window',
    },
  );
  return [start, end] as const;
}

function conditionsToFilters(conditions?: RuleConditionEntity[]) {
  return conditionsToAQL((conditions ?? []).filter(cond => !cond.customName))
    .filters;
}

function makeSpendingQuery({
  amountOp,
  conditions,
  conditionsOp,
  endDate,
  startDate,
}: {
  amountOp: '$gt' | '$lt';
  conditions: RuleConditionEntity[] | undefined;
  conditionsOp: 'and' | 'or' | undefined;
  endDate: string;
  startDate: string;
}) {
  const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';
  const intervalGroup = { $day: '$date' };
  return q('transactions')
    .filter({
      [conditionsOpKey]: conditionsToFilters(conditions),
    })
    .filter({
      $and: [{ date: { $gte: startDate } }, { date: { $lte: endDate } }],
      amount: { [amountOp]: 0 },
    })
    .groupBy([
      intervalGroup,
      { $id: '$account' },
      { $id: '$payee' },
      { $id: '$category' },
      { $id: '$payee.transfer_acct.id' },
    ])
    .select([
      { date: intervalGroup },
      { categoryIncome: { $id: '$category.is_income' } },
      { accountOffBudget: { $id: '$account.offbudget' } },
      { amount: { $sum: '$amount' } },
    ])
    .serialize();
}

function makeBudgetQuery({
  budgetType,
  compareMonth,
}: {
  budgetType: 'envelope' | 'tracking';
  compareMonth: string;
}) {
  const budgetTable =
    budgetType === 'tracking' ? 'reflect_budgets' : 'zero_budgets';
  return q(budgetTable)
    .filter({ month: { $eq: Number(compareMonth.replace('-', '')) } })
    .groupBy('category')
    .select(['category', { amount: { $sum: '$amount' } }])
    .serialize();
}

function isSupportedCategoryCondition(condition: RuleConditionEntity): boolean {
  if (condition.field !== 'category' && condition.field !== 'category_group') {
    return false;
  }

  if (condition.op === 'is' || condition.op === 'isNot') {
    return typeof condition.value === 'string';
  }

  if (condition.op === 'oneOf' || condition.op === 'notOneOf') {
    return (
      Array.isArray(condition.value) &&
      condition.value.every(id => typeof id === 'string')
    );
  }

  return (
    (condition.op === 'contains' ||
      condition.op === 'doesNotContain' ||
      condition.op === 'matches') &&
    typeof condition.value === 'string'
  );
}

function filterCategoriesByConditions({
  categories,
  categoryGroups,
  conditions,
  conditionsOp,
}: {
  categories: CategoryEntity[];
  categoryGroups: CategoryGroupEntity[];
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
}) {
  const categoryConditions = (conditions ?? []).filter(
    condition =>
      !condition.customName &&
      (condition.field === 'category' || condition.field === 'category_group'),
  );

  if (categoryConditions.length === 0) {
    return categories;
  }

  if (!categoryConditions.every(isSupportedCategoryCondition)) {
    return categories;
  }

  const categoryGroupNameById = new Map(
    categoryGroups.map(group => [group.id, group.name] as const),
  );

  function evaluateCondition(
    category: CategoryEntity,
    condition: RuleConditionEntity,
  ) {
    const key =
      condition.field === 'category_group'
        ? (category.group ?? '')
        : category.id;
    const textValue =
      condition.field === 'category_group'
        ? (categoryGroupNameById.get(key) ?? key)
        : category.name;

    if (condition.op === 'is') {
      return key === condition.value;
    }
    if (condition.op === 'isNot') {
      return key !== condition.value;
    }
    if (condition.op === 'oneOf' && Array.isArray(condition.value)) {
      return condition.value.includes(key);
    }
    if (condition.op === 'notOneOf' && Array.isArray(condition.value)) {
      return !condition.value.includes(key);
    }
    if (condition.op === 'contains' && typeof condition.value === 'string') {
      return textValue.toLowerCase().includes(condition.value.toLowerCase());
    }
    if (
      condition.op === 'doesNotContain' &&
      typeof condition.value === 'string'
    ) {
      return !textValue.toLowerCase().includes(condition.value.toLowerCase());
    }
    if (
      condition.op === 'matches' &&
      typeof condition.value === 'string' &&
      condition.value.length <= 256
    ) {
      try {
        return new RegExp(condition.value, 'i').test(textValue);
      } catch {
        return false;
      }
    }
    return true;
  }

  return categories.filter(category =>
    conditionsOp === 'or'
      ? categoryConditions.some(condition =>
          evaluateCondition(category, condition),
        )
      : categoryConditions.every(condition =>
          evaluateCondition(category, condition),
        ),
  );
}

function getDailyBudget({
  budgetRows,
  categories,
  categoryGroups,
  compareIntervalLength,
  conditions,
  conditionsOp,
}: {
  budgetRows: BudgetRow[];
  categories: CategoryEntity[];
  categoryGroups: CategoryGroupEntity[];
  compareIntervalLength: number;
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
}) {
  const hasBudgetConditions = (conditions ?? []).some(
    condition =>
      !condition.customName &&
      (condition.field === 'category' || condition.field === 'category_group'),
  );
  const matchingCategoryIds = hasBudgetConditions
    ? new Set(
        filterCategoriesByConditions({
          categories,
          categoryGroups,
          conditions,
          conditionsOp,
        }).map(category => category.id),
      )
    : null;

  const budgeted = budgetRows
    .filter(
      row =>
        !matchingCategoryIds || matchingCategoryIds.has(row.category ?? ''),
    )
    .reduce((sum, row) => sum + (row.amount ?? 0), 0);

  return budgeted / compareIntervalLength;
}

function calculateSpendingData({
  assets,
  assetsTo,
  averageRange,
  budgetRows,
  categories,
  categoryGroups,
  compareMonth,
  compareToMonth,
  conditions,
  conditionsOp,
  debts,
  debtsTo,
  endDate,
  endDateTo,
  earliestTransactionDate,
  startDate,
  startDateTo,
}: {
  assets: SpendingRow[];
  assetsTo: SpendingRow[];
  averageRange?: SpendingAverageRange;
  budgetRows: BudgetRow[];
  categories: CategoryEntity[];
  categoryGroups: CategoryGroupEntity[];
  compareMonth: string;
  compareToMonth: string;
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
  debts: SpendingRow[];
  debtsTo: SpendingRow[];
  endDate: string;
  endDateTo: string;
  earliestTransactionDate: string | null;
  startDate: string;
  startDateTo: string;
}): JSONValue {
  const earliestMonth = earliestTransactionDate
    ? monthUtils.monthFromDate(earliestTransactionDate)
    : null;
  const resolvedAverageRange = resolveAverageRange({
    averageRange,
    compare: compareMonth,
    earliestMonth,
  });
  const averageMonths = new Set(resolvedAverageRange.months);
  const compareInterval = monthUtils.dayRangeInclusive(
    compareMonth + '-01',
    monthUtils.getMonthEnd(compareMonth + '-01'),
  );
  const dailyBudget = getDailyBudget({
    budgetRows,
    categories,
    categoryGroups,
    compareIntervalLength: compareInterval.length,
    conditions,
    conditionsOp,
  });
  const overlapCompareTo = endDateTo < startDate || startDateTo > endDate;
  const totalsByDate = new Map<
    string,
    { perIntervalAssets: number; perIntervalDebts: number }
  >();

  for (const asset of [...assets, ...(overlapCompareTo ? assetsTo : [])]) {
    if (asset.categoryIncome || asset.accountOffBudget || !asset.date) {
      continue;
    }
    const totals = totalsByDate.get(asset.date) ?? {
      perIntervalAssets: 0,
      perIntervalDebts: 0,
    };
    totals.perIntervalAssets += asset.amount ?? 0;
    totalsByDate.set(asset.date, totals);
  }

  for (const debt of [...debts, ...(overlapCompareTo ? debtsTo : [])]) {
    if (debt.categoryIncome || debt.accountOffBudget || !debt.date) {
      continue;
    }
    const totals = totalsByDate.get(debt.date) ?? {
      perIntervalAssets: 0,
      perIntervalDebts: 0,
    };
    totals.perIntervalDebts += debt.amount ?? 0;
    totalsByDate.set(debt.date, totals);
  }

  const intervals = monthUtils.dayRangeInclusive(startDate, endDate);
  if (overlapCompareTo) {
    intervals.push(...monthUtils.dayRangeInclusive(startDateTo, endDateTo));
  }

  const days = [...Array(29).keys()]
    .filter(day => day > 0)
    .map(day => day.toString().padStart(2, '0'));
  const months = monthUtils.rangeInclusive(startDate, endDate).map(month => ({
    month,
    perMonthAssets: 0,
    perMonthDebts: 0,
  }));

  if (overlapCompareTo) {
    months.unshift({
      month: compareToMonth,
      perMonthAssets: 0,
      perMonthDebts: 0,
    });
  }

  let totalAssets = 0;
  let totalBudget = 0;
  let totalDebts = 0;

  const intervalData = days.map(day => {
    let averageSum = 0;
    let monthCount = 0;
    const dayData = months.map(month => {
      const data: Array<{
        cumulative: number | null;
        date: string;
        totalAssets: number;
        totalDebts: number;
        totalTotals: number;
      }> = [];

      for (const intervalItem of intervals) {
        const offsetDay =
          Number(intervalItem.substring(8, 10)) >= 28
            ? '28'
            : intervalItem.substring(8, 10);

        if (
          month.month !== monthUtils.getMonth(intervalItem) ||
          day !== offsetDay
        ) {
          continue;
        }

        const totals = totalsByDate.get(intervalItem);
        const perIntervalAssets = totals?.perIntervalAssets ?? 0;
        const perIntervalDebts = totals?.perIntervalDebts ?? 0;

        totalAssets += perIntervalAssets;
        totalDebts += perIntervalDebts;

        let cumulativeAssets = 0;
        let cumulativeDebts = 0;

        if (month.month === compareMonth) {
          totalBudget -= dailyBudget;
        }

        for (const monthState of months) {
          if (monthState.month === month.month) {
            cumulativeAssets = monthState.perMonthAssets += perIntervalAssets;
            cumulativeDebts = monthState.perMonthDebts += perIntervalDebts;
          }
        }

        if (averageMonths.has(month.month)) {
          if (day === '28') {
            if (monthUtils.getMonthEnd(intervalItem) === intervalItem) {
              averageSum += cumulativeAssets + cumulativeDebts;
              monthCount += 1;
            }
          } else {
            averageSum += cumulativeAssets + cumulativeDebts;
            monthCount += 1;
          }
        }

        data.push({
          cumulative:
            intervalItem <= monthUtils.currentDay()
              ? cumulativeDebts + cumulativeAssets
              : null,
          date: intervalItem,
          totalAssets: perIntervalAssets,
          totalDebts: perIntervalDebts,
          totalTotals: perIntervalDebts + perIntervalAssets,
        });
      }

      const maxCumulative = data.reduce(
        (current, next) => (next.cumulative === null ? current : next),
        data[0],
      )?.cumulative;
      const totalDaily = data.reduce(
        (sum, value) => sum + value.totalTotals,
        0,
      );

      return {
        cumulative: maxCumulative ?? null,
        daily: totalDaily,
        date: data[0]?.date ?? `${month.month}-${day}`,
        month: month.month,
      };
    });

    return {
      average: monthCount === 0 ? 0 : Math.round(averageSum / monthCount),
      budget: totalBudget,
      compare:
        dayData.find(value => value.month === compareMonth)?.cumulative ?? null,
      compareTo:
        dayData.find(value => value.month === compareToMonth)?.cumulative ??
        null,
      day,
      months: Object.fromEntries(dayData.map(value => [value.month, value])),
    };
  });

  return {
    averageRange: resolvedAverageRange,
    endDate,
    intervalData,
    startDate,
    totalAssets,
    totalDebts,
    totalTotals: totalAssets + totalDebts,
  };
}

export function createSpendingReportPlan({
  budgetType,
  earliestTransactionDate,
  sheet,
  widget,
}: {
  budgetType: 'envelope' | 'tracking';
  earliestTransactionDate: string | null;
  sheet: Spreadsheet;
  widget: SpendingWidget;
}): ReportPlan {
  const meta = widget.meta;
  const [compareMonth, compareToMonth] = calculateSpendingTimeRange(meta);
  const averageRange = normalizeAverageRange(meta?.averageRange);
  const resolvedAverageRange = resolveAverageRange({
    averageRange,
    compare: compareMonth,
    earliestMonth: earliestTransactionDate
      ? monthUtils.monthFromDate(earliestTransactionDate)
      : null,
  });
  const startDate = (resolvedAverageRange.startMonth ?? compareMonth) + '-01';
  const endDate = monthUtils.getMonthEnd(compareMonth + '-01');
  const startDateTo = compareToMonth + '-01';
  const endDateTo = monthUtils.getMonthEnd(compareToMonth + '-01');
  const planHash = hashString(
    stableStringify({
      averageRange,
      budgetType,
      compareMonth,
      compareToMonth,
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      type: widget.type,
    }),
  );
  const sheetName = `report:${widget.id}:${planHash}`;
  const queryCells = [
    resolveName(sheetName, 'assets-query'),
    resolveName(sheetName, 'debts-query'),
    resolveName(sheetName, 'assets-to-query'),
    resolveName(sheetName, 'debts-to-query'),
    resolveName(sheetName, 'budget-query'),
    resolveName(sheetName, 'categories-query'),
    resolveName(sheetName, 'category-groups-query'),
  ];

  sheet.createQuery(
    sheetName,
    'assets-query',
    makeSpendingQuery({
      amountOp: '$gt',
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      endDate,
      startDate,
    }),
  );
  sheet.createQuery(
    sheetName,
    'debts-query',
    makeSpendingQuery({
      amountOp: '$lt',
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      endDate,
      startDate,
    }),
  );
  sheet.createQuery(
    sheetName,
    'assets-to-query',
    makeSpendingQuery({
      amountOp: '$gt',
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      endDate: endDateTo,
      startDate: startDateTo,
    }),
  );
  sheet.createQuery(
    sheetName,
    'debts-to-query',
    makeSpendingQuery({
      amountOp: '$lt',
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      endDate: endDateTo,
      startDate: startDateTo,
    }),
  );
  sheet.createQuery(
    sheetName,
    'budget-query',
    makeBudgetQuery({ budgetType, compareMonth }),
  );
  sheet.createQuery(
    sheetName,
    'categories-query',
    q('categories')
      .select(['id', 'name', 'is_income', 'hidden', 'group'])
      .serialize(),
  );
  sheet.createQuery(
    sheetName,
    'category-groups-query',
    q('category_groups')
      .select(['id', 'name', 'is_income', 'hidden'])
      .serialize(),
  );

  sheet.createDynamic(sheetName, 'data', {
    dependencies: queryCells,
    initialValue: null,
    run: (...values: JSONValue[]) =>
      calculateSpendingData({
        assets: Array.isArray(values[0]) ? (values[0] as SpendingRow[]) : [],
        debts: Array.isArray(values[1]) ? (values[1] as SpendingRow[]) : [],
        assetsTo: Array.isArray(values[2]) ? (values[2] as SpendingRow[]) : [],
        debtsTo: Array.isArray(values[3]) ? (values[3] as SpendingRow[]) : [],
        budgetRows: Array.isArray(values[4]) ? (values[4] as BudgetRow[]) : [],
        categories: Array.isArray(values[5])
          ? (values[5] as CategoryEntity[])
          : [],
        categoryGroups: Array.isArray(values[6])
          ? (values[6] as CategoryGroupEntity[])
          : [],
        averageRange,
        compareMonth,
        compareToMonth,
        conditions: meta?.conditions,
        conditionsOp: meta?.conditionsOp,
        earliestTransactionDate,
        endDate,
        endDateTo,
        startDate,
        startDateTo,
      }),
  });

  return {
    queryCells,
    rootName: resolveName(sheetName, 'data'),
    sheetName,
    widgetId: widget.id,
  };
}
