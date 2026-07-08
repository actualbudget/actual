import { HyperFormula } from 'hyperformula';
import enUS from 'hyperformula/i18n/languages/enUS';

import * as sheet from '#server/sheet';
import type { Spreadsheet } from '#server/spreadsheet/spreadsheet';
import { resolveName } from '#server/spreadsheet/util';
import { conditionsToAQL } from '#server/transactions/transaction-rules';
import { getCurrency } from '#shared/currencies';
import {
  createBudgetQueryPrefetchKey,
  CustomFunctionsPlugin,
  customFunctionsTranslations,
  setCachedUserPreferences,
} from '#shared/formulas/customFunctions';
import type {
  FormulaQueryContext,
  UserPreferences,
} from '#shared/formulas/customFunctions';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import type { Query } from '#shared/query';
import { getNumberFormat, integerToAmount } from '#shared/util';
import type { NumberFormats } from '#shared/util';
import type {
  CategoryEntity,
  CategoryGroupEntity,
  FormulaWidget,
  RuleConditionEntity,
  TimeFrame,
} from '#types/models';
import type { JSONValue } from '#types/report-spreadsheet';

import { calculateTimeRange, hashString, stableStringify } from './plan-utils';
import type { ReportPlan } from './types';

type QueryConfig = {
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
  timeFrame?: Partial<TimeFrame>;
};

type FormulaCellValue = number | string | boolean | null;

type PreferenceRow = {
  id?: string;
  value?: string | null;
};

type QueryNeeds = Pick<
  Required<FormulaQueryContext>,
  | 'queryCountNames'
  | 'queryExtractCategoryNames'
  | 'queryExtractTimeframeEndNames'
  | 'queryExtractTimeframeStartNames'
  | 'queryNames'
>;

let isFormulaBootstrapped = false;

function bootstrapFormulaRuntime(): void {
  if (isFormulaBootstrapped) {
    return;
  }

  if (!HyperFormula.getRegisteredLanguagesCodes().includes('enUS')) {
    HyperFormula.registerLanguage('enUS', enUS);
  }

  try {
    HyperFormula.registerFunctionPlugin(
      CustomFunctionsPlugin,
      customFunctionsTranslations,
    );
  } catch {
    // Already registered by another formula path.
  }

  isFormulaBootstrapped = true;
}

function createFormulaQueryContext(): Required<FormulaQueryContext> {
  return {
    budgetQueryErrors: new Map(),
    budgetQueryPrefetch: new Map(),
    budgetQueryRequests: new Map(),
    queryCountNames: new Set(),
    queryCountPrefetch: new Map(),
    queryExtractCategoriesPrefetch: new Map(),
    queryExtractCategoryNames: new Set(),
    queryExtractTimeframeEndNames: new Set(),
    queryExtractTimeframeEndPrefetch: new Map(),
    queryExtractTimeframeStartNames: new Set(),
    queryExtractTimeframeStartPrefetch: new Map(),
    queryNames: new Set(),
    querySumPrefetch: new Map(),
  };
}

function getLocaleDefaults(locale = 'en-US'): {
  decimalSeparator: string;
  thousandsSeparator: string;
} {
  const parts = new Intl.NumberFormat(locale).formatToParts(1_000_000.23);

  return {
    decimalSeparator: parts.find(part => part.type === 'decimal')?.value ?? '.',
    thousandsSeparator: parts.find(part => part.type === 'group')?.value ?? ',',
  };
}

function getNumberFormatFromLocale(locale: string): NumberFormats {
  const { decimalSeparator, thousandsSeparator } = getLocaleDefaults(locale);

  if (decimalSeparator === '.' && thousandsSeparator === ',') {
    return 'comma-dot';
  }
  if (decimalSeparator === ',' && thousandsSeparator === '.') {
    return 'dot-comma';
  }
  if (decimalSeparator === ',' && thousandsSeparator.trim() === '') {
    return 'space-comma';
  }
  if (
    decimalSeparator === '.' &&
    (thousandsSeparator === "'" || thousandsSeparator === '\u2019')
  ) {
    return 'apostrophe-dot';
  }
  return 'comma-dot';
}

function getFormulaPreferences(
  preferenceRows: PreferenceRow[],
): UserPreferences {
  const preferences = new Map(
    preferenceRows.map(row => [row.id ?? '', row.value ?? null] as const),
  );
  const locale = 'en-US';
  const isCurrencyFeatureEnabled = preferences.get('flags.currency') === 'true';
  const currencyFromPreference = isCurrencyFeatureEnabled
    ? getCurrency(preferences.get('defaultCurrencyCode') ?? 'USD')
    : null;
  const currency = currencyFromPreference?.code
    ? currencyFromPreference
    : getCurrency('USD');
  const numberFormat =
    (preferences.get('numberFormat') as NumberFormats | null) ??
    currencyFromPreference?.numberFormat ??
    getNumberFormatFromLocale(locale);
  const numberFormatSettings = getNumberFormat({ format: numberFormat });
  const localeDefaults = getLocaleDefaults(locale);
  const currencySymbolPosition = preferences.get('currencySymbolPosition');

  return {
    currency,
    currencySpaceBetweenAmountAndSymbol:
      currencyFromPreference?.code &&
      preferences.get('currencySpaceBetweenAmountAndSymbol') === 'true'
        ? true
        : false,
    currencySymbolPosition:
      currencyFromPreference?.code &&
      (currencySymbolPosition === 'before' ||
        currencySymbolPosition === 'after')
        ? currencySymbolPosition
        : currency.symbolFirst
          ? 'before'
          : 'after',
    decimalPlaces:
      preferences.get('hideFraction') === 'true' ? 0 : currency.decimalPlaces,
    decimalSeparator:
      numberFormatSettings.decimalSeparator || localeDefaults.decimalSeparator,
    locale,
    numberFormat,
    thousandsSeparator:
      numberFormatSettings.thousandsSeparator ||
      localeDefaults.thousandsSeparator,
  };
}

function isHyperFormulaError(
  cellValue: unknown,
): cellValue is { type: string; message?: string } {
  return Boolean(
    cellValue && typeof cellValue === 'object' && 'type' in cellValue,
  );
}

function evaluateFormulaWithContext({
  formula,
  formulaQueryContext,
  namedExpressions,
  throwOnCellError = true,
}: {
  formula: string;
  formulaQueryContext: FormulaQueryContext;
  namedExpressions?: Record<string, number | string>;
  throwOnCellError?: boolean;
}): FormulaCellValue {
  bootstrapFormulaRuntime();
  let hfInstance: ReturnType<typeof HyperFormula.buildEmpty> | null = null;

  try {
    hfInstance = HyperFormula.buildEmpty({
      context: {
        formulaQuery: formulaQueryContext,
      },
      dateFormats: ['DD/MM/YYYY', 'YYYY-MM-DD', 'YYYY/MM/DD'],
      language: 'enUS',
      licenseKey: 'gpl-v3',
      localeLang: 'en-US',
    });

    const sheetName = hfInstance.addSheet('Sheet1');
    const sheetId = hfInstance.getSheetId(sheetName);

    if (sheetId === undefined) {
      throw new Error('Failed to create sheet');
    }

    for (const [name, value] of Object.entries(namedExpressions ?? {})) {
      hfInstance.addNamedExpression(
        name,
        typeof value === 'number' ? value : String(value),
      );
    }

    hfInstance.setCellContents({ sheet: sheetId, col: 0, row: 0 }, [[formula]]);

    const cellValue = hfInstance.getCellValue({
      sheet: sheetId,
      col: 0,
      row: 0,
    });

    if (isHyperFormulaError(cellValue)) {
      if (throwOnCellError) {
        throw new Error(`Formula error: ${cellValue.type}`);
      }
      return null;
    }

    return cellValue as FormulaCellValue;
  } finally {
    hfInstance?.destroy();
  }
}

function normalizeQueryTimeFrameStart(dateOrMonth: string) {
  return dateOrMonth.split('-').length === 2
    ? monthUtils.firstDayOfMonth(dateOrMonth)
    : monthUtils.dayFromDate(dateOrMonth);
}

function normalizeQueryTimeFrameEnd(dateOrMonth: string) {
  return dateOrMonth.split('-').length === 2
    ? monthUtils.lastDayOfMonth(dateOrMonth)
    : monthUtils.dayFromDate(dateOrMonth);
}

function buildFilteredTransactionsQuery(config: QueryConfig): Query {
  const conditions = config.conditions || [];
  const conditionsOp = config.conditionsOp || 'and';
  const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';
  const { filters } = conditionsToAQL(conditions);
  let transQuery = q('transactions');

  if (config.timeFrame?.mode) {
    const [calculatedStart, calculatedEnd] = calculateTimeRange(
      config.timeFrame,
    );
    transQuery = transQuery.filter({
      $and: [
        { date: { $gte: normalizeQueryTimeFrameStart(calculatedStart) } },
        { date: { $lte: normalizeQueryTimeFrameEnd(calculatedEnd) } },
      ],
    });
  }

  if (filters.length > 0) {
    transQuery = transQuery.filter({ [conditionsOpKey]: filters });
  }

  return transQuery;
}

function extractCategoryConditions(
  conditions: RuleConditionEntity[],
): RuleConditionEntity[] {
  return conditions.filter(
    condition =>
      !condition.customName &&
      (condition.field === 'category' || condition.field === 'category_group'),
  );
}

function getCategoriesFromConditions({
  categories,
  categoryGroups,
  conditions,
  conditionsOp,
}: {
  categories: CategoryEntity[];
  categoryGroups: CategoryGroupEntity[];
  conditions: RuleConditionEntity[];
  conditionsOp: 'and' | 'or';
}): string[] {
  if (conditions.length === 0) {
    return categories
      .filter(category => !category.is_income && !category.hidden)
      .map(category => category.id);
  }

  const groupNameById = new Map(
    categoryGroups.map(group => [group.id, group.name] as const),
  );
  const conditionResults = conditions.map(condition => {
    const matching = categories.filter(category => {
      const key =
        condition.field === 'category_group'
          ? (category.group ?? '')
          : category.id;
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
      if (condition.op === 'matches' && typeof condition.value === 'string') {
        try {
          return new RegExp(condition.value, 'i').test(textValue);
        } catch {
          return false;
        }
      }
      return false;
    });
    return matching.map(category => category.id);
  });

  if (conditionsOp === 'or') {
    return Array.from(new Set(conditionResults.flat()));
  }

  const matchingIds = new Set(conditionResults[0]);
  for (const result of conditionResults.slice(1)) {
    const currentIds = new Set(result);
    for (const id of matchingIds) {
      if (!currentIds.has(id)) {
        matchingIds.delete(id);
      }
    }
  }
  return Array.from(matchingIds);
}

function extractQueryCategories(
  queryName: string,
  categories: CategoryEntity[],
  categoryGroups: CategoryGroupEntity[],
  queries: Record<string, QueryConfig>,
): string[] {
  const queryConfig = queries[queryName];
  if (!queryConfig) {
    return [];
  }

  return getCategoriesFromConditions({
    categories,
    categoryGroups,
    conditions: extractCategoryConditions(queryConfig.conditions || []),
    conditionsOp: queryConfig.conditionsOp || 'and',
  });
}

function extractQueryTimeframeStart(
  queryName: string,
  queries: Record<string, QueryConfig>,
): string {
  const queryConfig = queries[queryName];
  if (!queryConfig?.timeFrame) {
    return monthUtils.currentMonth();
  }

  const [startMonth] = calculateTimeRange(queryConfig.timeFrame);
  return startMonth;
}

function extractQueryTimeframeEnd(
  queryName: string,
  queries: Record<string, QueryConfig>,
): string {
  const queryConfig = queries[queryName];
  if (!queryConfig?.timeFrame) {
    return monthUtils.currentMonth();
  }

  const [, endMonth] = calculateTimeRange(queryConfig.timeFrame);
  return endMonth;
}

function getBudgetCellValue(month: string, cellName: string): JSONValue {
  return sheet.getCellValue(monthUtils.sheetForMonth(month), cellName);
}

function getBudgetNumber(month: string, cellName: string): number {
  const value = getBudgetCellValue(month, cellName);
  return typeof value === 'number' ? value : 0;
}

function fetchBudgetDimensionValueDirect({
  categoryIds,
  dimension,
  endMonth,
  startMonth,
}: {
  categoryIds: string[];
  dimension: string;
  endMonth: string;
  startMonth: string;
}): number {
  const dim = dimension.toLowerCase();
  const intervals = monthUtils.rangeInclusive(startMonth, endMonth);

  function sumDimension(fieldPattern: string) {
    let total = 0;
    for (const month of intervals) {
      for (const categoryId of categoryIds) {
        total += getBudgetNumber(
          month,
          fieldPattern.replace('{catId}', categoryId),
        );
      }
    }
    return total;
  }

  if (dim === 'budgeted') {
    return integerToAmount(sumDimension('budget-{catId}'), 2);
  }
  if (dim === 'spent') {
    return integerToAmount(sumDimension('sum-amount-{catId}'), 2);
  }
  if (dim === 'goal') {
    return integerToAmount(sumDimension('goal-{catId}'), 2);
  }
  if (dim !== 'balance_start' && dim !== 'balance_end') {
    throw new Error(`Invalid BUDGET_QUERY dimension: ${dimension}`);
  }

  let runningBalance = 0;
  const monthBeforeStart = monthUtils.subMonths(startMonth, 1);
  for (const categoryId of categoryIds) {
    const categoryBalance = getBudgetNumber(
      monthBeforeStart,
      `leftover-${categoryId}`,
    );
    const hasCarryover = Boolean(
      getBudgetCellValue(monthBeforeStart, `carryover-${categoryId}`),
    );
    if (categoryBalance > 0 || (categoryBalance < 0 && hasCarryover)) {
      runningBalance += categoryBalance;
    }
  }

  const balances: Record<string, { end: number; start: number }> = {};
  for (const month of intervals) {
    let budgeted = 0;
    let carryoverToNextMonth = 0;
    let spent = 0;

    for (const categoryId of categoryIds) {
      const categoryBudgeted = getBudgetNumber(month, `budget-${categoryId}`);
      const categorySpent = getBudgetNumber(month, `sum-amount-${categoryId}`);
      const categoryBalance = getBudgetNumber(month, `leftover-${categoryId}`);
      const hasCarryover = Boolean(
        getBudgetCellValue(month, `carryover-${categoryId}`),
      );

      budgeted += categoryBudgeted;
      spent += categorySpent;

      if (categoryBalance > 0 || (categoryBalance < 0 && hasCarryover)) {
        carryoverToNextMonth += categoryBalance;
      }
    }

    balances[month] = {
      end: budgeted + spent + runningBalance,
      start: runningBalance,
    };
    runningBalance = carryoverToNextMonth;
  }

  if (dim === 'balance_start') {
    return integerToAmount(balances[intervals[0]]?.start || 0, 2);
  }
  return integerToAmount(
    balances[intervals[intervals.length - 1]]?.end || 0,
    2,
  );
}

function prefetchBudgetQueries(
  formulaQueryContext: Required<FormulaQueryContext>,
) {
  for (const request of formulaQueryContext.budgetQueryRequests.values()) {
    const key = createBudgetQueryPrefetchKey(request);

    try {
      formulaQueryContext.budgetQueryPrefetch.set(
        key,
        fetchBudgetDimensionValueDirect(request),
      );
      formulaQueryContext.budgetQueryErrors.delete(key);
    } catch (err) {
      formulaQueryContext.budgetQueryPrefetch.delete(key);
      formulaQueryContext.budgetQueryErrors.set(
        key,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

function normalizeFormulaResult(value: FormulaCellValue): JSONValue {
  if (
    value === null ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return value;
  }
  return String(value);
}

function collectFormulaNeeds(formula: string): QueryNeeds {
  const formulaQueryContext = createFormulaQueryContext();

  if (formula.startsWith('=')) {
    try {
      evaluateFormulaWithContext({
        formula,
        formulaQueryContext,
        throwOnCellError: false,
      });
    } catch {
      // Invalid formulas are handled by the final execution path.
    }
  }

  return {
    queryCountNames: formulaQueryContext.queryCountNames,
    queryExtractCategoryNames: formulaQueryContext.queryExtractCategoryNames,
    queryExtractTimeframeEndNames:
      formulaQueryContext.queryExtractTimeframeEndNames,
    queryExtractTimeframeStartNames:
      formulaQueryContext.queryExtractTimeframeStartNames,
    queryNames: formulaQueryContext.queryNames,
  };
}

function executeFormulaForReport({
  categories,
  categoryGroups,
  formula,
  namedExpressions,
  preferenceRows,
  queries,
  queryCountValues,
  querySumValues,
  needs,
}: {
  categories: CategoryEntity[];
  categoryGroups: CategoryGroupEntity[];
  formula: string;
  namedExpressions?: Record<string, number | string>;
  needs: QueryNeeds;
  preferenceRows: PreferenceRow[];
  queries: Record<string, QueryConfig>;
  queryCountValues: Map<string, number>;
  querySumValues: Map<string, number>;
}): JSONValue {
  if (!formula || !formula.startsWith('=')) {
    return { error: 'Formula must start with =', result: null };
  }

  try {
    setCachedUserPreferences(getFormulaPreferences(preferenceRows));

    const formulaQueryContext = createFormulaQueryContext();

    for (const queryName of needs.queryNames) {
      formulaQueryContext.querySumPrefetch.set(
        queryName,
        querySumValues.get(queryName) ?? 0,
      );
    }

    for (const queryName of needs.queryCountNames) {
      formulaQueryContext.queryCountPrefetch.set(
        queryName,
        queryCountValues.get(queryName) ?? 0,
      );
    }

    for (const queryName of needs.queryExtractCategoryNames) {
      formulaQueryContext.queryExtractCategoriesPrefetch.set(
        queryName,
        extractQueryCategories(queryName, categories, categoryGroups, queries),
      );
    }

    for (const queryName of needs.queryExtractTimeframeStartNames) {
      formulaQueryContext.queryExtractTimeframeStartPrefetch.set(
        queryName,
        extractQueryTimeframeStart(queryName, queries),
      );
    }

    for (const queryName of needs.queryExtractTimeframeEndNames) {
      formulaQueryContext.queryExtractTimeframeEndPrefetch.set(
        queryName,
        extractQueryTimeframeEnd(queryName, queries),
      );
    }

    evaluateFormulaWithContext({
      formula,
      formulaQueryContext,
      namedExpressions,
      throwOnCellError: false,
    });

    prefetchBudgetQueries(formulaQueryContext);

    const result = evaluateFormulaWithContext({
      formula,
      formulaQueryContext,
      namedExpressions,
    });

    return { error: null, result: normalizeFormulaResult(result) };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Unknown error',
      result: null,
    };
  }
}

export function createFormulaReportPlan({
  sheet,
  widget,
}: {
  sheet: Spreadsheet;
  widget: FormulaWidget;
}): ReportPlan {
  const meta = widget.meta;
  const formula = meta?.formula || '=SUM(1, 2, 3)';
  const queries = meta?.queries || {};
  const needs = collectFormulaNeeds(formula);
  const sumQueryNames = [...needs.queryNames].filter(name => queries[name]);
  const countQueryNames = [...needs.queryCountNames].filter(
    name => queries[name],
  );
  const planHash = hashString(
    stableStringify({
      formula,
      queries,
      type: widget.type,
    }),
  );
  const sheetName = `report:${widget.id}:${planHash}`;
  const preferencesCell = resolveName(sheetName, 'preferences-query');
  const categoriesCell = resolveName(sheetName, 'categories-query');
  const categoryGroupsCell = resolveName(sheetName, 'category-groups-query');
  const budgetsCell = resolveName(sheetName, 'budgets-dependency-query');
  const sumQueryCells = sumQueryNames.map(name =>
    resolveName(sheetName, `query-sum-${hashString(name)}`),
  );
  const countQueryCells = countQueryNames.map(name =>
    resolveName(sheetName, `query-count-${hashString(name)}`),
  );
  const queryCells = [
    preferencesCell,
    categoriesCell,
    categoryGroupsCell,
    budgetsCell,
    ...sumQueryCells,
    ...countQueryCells,
  ];

  // ponytail: broad category/budget deps; narrow by parsed functions if noisy.
  sheet.createQuery(
    sheetName,
    'preferences-query',
    q('preferences').select(['id', 'value']).serialize(),
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
  sheet.createQuery(
    sheetName,
    'budgets-dependency-query',
    q('zero_budgets').calculate({ $count: '*' }).serialize(),
  );

  for (const queryName of sumQueryNames) {
    sheet.createQuery(
      sheetName,
      `query-sum-${hashString(queryName)}`,
      buildFilteredTransactionsQuery(queries[queryName])
        .calculate({ $sum: '$amount' })
        .serialize(),
    );
  }

  for (const queryName of countQueryNames) {
    sheet.createQuery(
      sheetName,
      `query-count-${hashString(queryName)}`,
      buildFilteredTransactionsQuery(queries[queryName])
        .calculate({ $count: '*' })
        .serialize(),
    );
  }

  sheet.createDynamic(sheetName, 'data', {
    dependencies: queryCells,
    initialValue: null,
    run: (...values: unknown[]) => {
      const querySumValues = new Map<string, number>();
      const queryCountValues = new Map<string, number>();
      const sumStartIndex = 4;
      const countStartIndex = sumStartIndex + sumQueryNames.length;

      for (const [index, queryName] of sumQueryNames.entries()) {
        const value = values[sumStartIndex + index];
        querySumValues.set(
          queryName,
          integerToAmount(typeof value === 'number' ? value : 0, 2),
        );
      }

      for (const [index, queryName] of countQueryNames.entries()) {
        const value = values[countStartIndex + index];
        queryCountValues.set(queryName, typeof value === 'number' ? value : 0);
      }

      return executeFormulaForReport({
        categories: Array.isArray(values[1])
          ? (values[1] as CategoryEntity[])
          : [],
        categoryGroups: Array.isArray(values[2])
          ? (values[2] as CategoryGroupEntity[])
          : [],
        formula,
        needs,
        preferenceRows: Array.isArray(values[0])
          ? (values[0] as PreferenceRow[])
          : [],
        queries,
        queryCountValues,
        querySumValues,
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
