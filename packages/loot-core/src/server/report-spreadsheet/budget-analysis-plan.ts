import * as sheet from '#server/sheet';
import type { Spreadsheet } from '#server/spreadsheet/spreadsheet';
import { resolveName } from '#server/spreadsheet/util';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import type {
  BudgetAnalysisWidget,
  CategoryEntity,
  CategoryGroupEntity,
  RuleConditionEntity,
  TimeFrame,
} from '#types/models';
import type { JSONValue } from '#types/report-spreadsheet';

import { calculateTimeRange, hashString, stableStringify } from './plan-utils';
import type { ReportPlan } from './types';

type CategoryCondition = Extract<
  RuleConditionEntity,
  { field: 'category' | 'category_group' }
>;

function getDefaultTimeFrame(): TimeFrame {
  return {
    start: monthUtils.subMonths(monthUtils.currentMonth(), 5),
    end: monthUtils.currentMonth(),
    mode: 'sliding-window',
  };
}

function isCategoryCondition(
  condition: RuleConditionEntity,
): condition is CategoryCondition {
  return condition.field === 'category' || condition.field === 'category_group';
}

function isBaseCategory(
  category: CategoryEntity,
  showHiddenCategories: boolean,
): boolean {
  return !category.is_income && (showHiddenCategories || !category.hidden);
}

function matchesCategoryCondition({
  category,
  condition,
  groupNameById,
}: {
  category: CategoryEntity;
  condition: CategoryCondition;
  groupNameById: Map<string, string>;
}) {
  const key =
    condition.field === 'category_group' ? (category.group ?? '') : category.id;
  const textValue =
    condition.field === 'category_group'
      ? (groupNameById.get(key) ?? key)
      : category.name;

  if (condition.op === 'is') {
    return condition.value === key;
  }
  if (condition.op === 'isNot') {
    return condition.value !== key;
  }
  if (condition.op === 'oneOf') {
    return Array.isArray(condition.value) && condition.value.includes(key);
  }
  if (condition.op === 'notOneOf') {
    return Array.isArray(condition.value) && !condition.value.includes(key);
  }
  if (condition.op === 'contains') {
    return (
      typeof condition.value === 'string' &&
      textValue.toLowerCase().includes(condition.value.toLowerCase())
    );
  }
  if (condition.op === 'doesNotContain') {
    return (
      typeof condition.value === 'string' &&
      !textValue.toLowerCase().includes(condition.value.toLowerCase())
    );
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

  return false;
}

function getCategoriesToInclude({
  categories,
  categoryGroups,
  conditions,
  conditionsOp,
  showHiddenCategories,
}: {
  categories: CategoryEntity[];
  categoryGroups: CategoryGroupEntity[];
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
  showHiddenCategories: boolean;
}) {
  const groupNameById = new Map(
    categoryGroups.map(group => [group.id, group.name] as const),
  );
  const baseCategories = categories.filter(category =>
    isBaseCategory(category, showHiddenCategories),
  );
  const relevantConditions = (conditions ?? [])
    .filter(isCategoryCondition)
    .filter(condition => !condition.customName);

  if (relevantConditions.length === 0) {
    return baseCategories;
  }

  const conditionResults = relevantConditions.map(condition =>
    baseCategories.filter(category =>
      matchesCategoryCondition({ category, condition, groupNameById }),
    ),
  );

  if (conditionsOp === 'or') {
    const categoryIds = new Set(conditionResults.flat().map(cat => cat.id));
    return baseCategories.filter(category => categoryIds.has(category.id));
  }

  const matchingIds = new Set(conditionResults[0].map(cat => cat.id));
  for (const result of conditionResults.slice(1)) {
    const currentIds = new Set(result.map(cat => cat.id));
    for (const id of matchingIds) {
      if (!currentIds.has(id)) {
        matchingIds.delete(id);
      }
    }
  }
  return baseCategories.filter(category => matchingIds.has(category.id));
}

function getBudgetCellValue(month: string, cellName: string): JSONValue {
  return sheet.getCellValue(monthUtils.sheetForMonth(month), cellName);
}

function getBudgetNumber(month: string, cellName: string): number {
  const value = getBudgetCellValue(month, cellName);
  return typeof value === 'number' ? value : 0;
}

function calculateBudgetAnalysisData({
  categories,
  categoryGroups,
  conditions,
  conditionsOp,
  endDate,
  showHiddenCategories,
  startDate,
}: {
  categories: CategoryEntity[];
  categoryGroups: CategoryGroupEntity[];
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
  endDate: string;
  showHiddenCategories: boolean;
  startDate: string;
}): JSONValue {
  const categoriesToInclude = getCategoriesToInclude({
    categories,
    categoryGroups,
    conditions,
    conditionsOp,
    showHiddenCategories,
  });
  const intervals = monthUtils.rangeInclusive(
    monthUtils.getMonth(startDate),
    monthUtils.getMonth(endDate),
  );
  const monthBeforeStart = monthUtils.subMonths(
    monthUtils.getMonth(startDate),
    1,
  );
  let runningBalance = 0;

  for (const category of categoriesToInclude) {
    const categoryBalance = getBudgetNumber(
      monthBeforeStart,
      `leftover-${category.id}`,
    );
    const hasCarryover = Boolean(
      getBudgetCellValue(monthBeforeStart, `carryover-${category.id}`),
    );

    if (categoryBalance > 0 || (categoryBalance < 0 && hasCarryover)) {
      runningBalance += categoryBalance;
    }
  }

  let totalBudgeted = 0;
  let totalOverspendingAdjustment = 0;
  let totalSpent = 0;
  let overspendingFromPrevMonth = 0;
  const intervalData = intervals.map(month => {
    let budgeted = 0;
    let carryoverToNextMonth = 0;
    let overspendingThisMonth = 0;
    let spent = 0;

    for (const category of categoriesToInclude) {
      const categoryBudgeted = getBudgetNumber(month, `budget-${category.id}`);
      const categorySpent = getBudgetNumber(month, `sum-amount-${category.id}`);
      const categoryBalance = getBudgetNumber(month, `leftover-${category.id}`);
      const hasCarryover = Boolean(
        getBudgetCellValue(month, `carryover-${category.id}`),
      );

      budgeted += categoryBudgeted;
      spent += categorySpent;

      if (categoryBalance > 0 || (categoryBalance < 0 && hasCarryover)) {
        carryoverToNextMonth += categoryBalance;
      } else if (categoryBalance < 0) {
        overspendingThisMonth += categoryBalance;
      }
    }

    const overspendingAdjustment = overspendingFromPrevMonth;
    const balance = budgeted + spent + runningBalance;

    totalBudgeted += budgeted;
    totalSpent += spent;
    totalOverspendingAdjustment += Math.abs(overspendingAdjustment);
    runningBalance = carryoverToNextMonth;
    overspendingFromPrevMonth = overspendingThisMonth;

    return {
      balance,
      budgeted,
      date: month,
      overspendingAdjustment: Math.abs(overspendingAdjustment),
      spent,
    };
  });

  return {
    endDate,
    finalOverspendingAdjustment: overspendingFromPrevMonth,
    intervalData,
    startDate,
    totalBudgeted,
    totalOverspendingAdjustment,
    totalSpent,
  };
}

export function createBudgetAnalysisReportPlan({
  sheet: reportSheet,
  widget,
}: {
  sheet: Spreadsheet;
  widget: BudgetAnalysisWidget;
}): ReportPlan {
  const meta = widget.meta;
  const [startMonth, endMonth] = calculateTimeRange(
    meta?.timeFrame,
    getDefaultTimeFrame(),
  );
  const startDate = monthUtils.monthFromDate(startMonth) + '-01';
  const endDate = monthUtils.getMonthEnd(
    monthUtils.monthFromDate(endMonth) + '-01',
  );
  const showHiddenCategories = meta?.showHiddenCategories ?? false;
  const planHash = hashString(
    stableStringify({
      conditions: meta?.conditions,
      conditionsOp: meta?.conditionsOp,
      endDate,
      showHiddenCategories,
      startDate,
      type: widget.type,
    }),
  );
  const sheetName = `report:${widget.id}:${planHash}`;
  const queryCells = [
    resolveName(sheetName, 'categories-query'),
    resolveName(sheetName, 'category-groups-query'),
    resolveName(sheetName, 'transactions-dependency-query'),
    resolveName(sheetName, 'budgets-dependency-query'),
  ];

  reportSheet.createQuery(
    sheetName,
    'categories-query',
    q('categories')
      .select(['id', 'name', 'is_income', 'hidden', 'group'])
      .serialize(),
  );
  reportSheet.createQuery(
    sheetName,
    'category-groups-query',
    q('category_groups')
      .select(['id', 'name', 'is_income', 'hidden'])
      .serialize(),
  );
  // ponytail: broad deps; narrow by month if report recompute volume matters.
  reportSheet.createQuery(
    sheetName,
    'transactions-dependency-query',
    q('transactions').calculate({ $count: '*' }).serialize(),
  );
  reportSheet.createQuery(
    sheetName,
    'budgets-dependency-query',
    q('zero_budgets').calculate({ $count: '*' }).serialize(),
  );

  reportSheet.createDynamic(sheetName, 'data', {
    dependencies: queryCells,
    initialValue: null,
    run: (...values: JSONValue[]) =>
      calculateBudgetAnalysisData({
        categories: Array.isArray(values[0])
          ? (values[0] as CategoryEntity[])
          : [],
        categoryGroups: Array.isArray(values[1])
          ? (values[1] as CategoryGroupEntity[])
          : [],
        conditions: meta?.conditions,
        conditionsOp: meta?.conditionsOp,
        endDate,
        showHiddenCategories,
        startDate,
      }),
  });

  return {
    queryCells,
    rootName: resolveName(sheetName, 'data'),
    sheetName,
    widgetId: widget.id,
  };
}
