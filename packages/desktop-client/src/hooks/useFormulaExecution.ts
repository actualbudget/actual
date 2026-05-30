import { useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type { Query } from '@actual-app/core/shared/query';
import { integerToAmount } from '@actual-app/core/shared/util';
import type {
  CategoryEntity,
  RuleConditionEntity,
  TimeFrame,
} from '@actual-app/core/types/models';
import { HyperFormula } from 'hyperformula';

import { getLiveRange } from '#components/reports/getLiveRange';
import { calculateTimeRange } from '#components/reports/reportRanges';

import { useLocale } from './useLocale';

type QueryConfig = {
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
  timeFrame?: TimeFrame;
};

type QueriesMap = Record<string, QueryConfig>;

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Parse a BUDGET_QUERY parameter - can be extraction function, array literal, or string
function parseBudgetParam(
  param: string,
): { type: 'extraction' | 'literal'; data: unknown } | null {
  param = param.trim();

  // Try extraction function: QUERY_EXTRACT_*("queryName")
  const extractMatch = param.match(
    /^(QUERY_EXTRACT_\w+)\s*\(\s*["']([^"']+)["']\s*\)$/,
  );
  if (extractMatch) {
    return {
      type: 'extraction',
      data: { funcName: extractMatch[1], queryName: extractMatch[2] },
    };
  }

  // Try array literal: {"id1";"id2";...}
  const arrayMatch = param.match(/^\{([^}]*)\}$/);
  if (arrayMatch) {
    const items = arrayMatch[1]
      .split(';')
      .map(item => item.replace(/^["']|["']$/g, '').trim())
      .filter(item => item.length > 0);
    return { type: 'literal', data: items };
  }

  // Try string literal: "value"
  const stringMatch = param.match(/^["']([^"']*)["']$/);
  if (stringMatch) {
    return { type: 'literal', data: stringMatch[1] };
  }

  return null;
}

// Resolve a parsed BUDGET_QUERY parameter to its actual value
function resolveBudgetParam(
  parsed: ReturnType<typeof parseBudgetParam>,
  extractionResults: Record<string, Record<string, unknown>>,
): unknown {
  if (!parsed || parsed.type === 'literal') {
    return parsed?.data;
  }

  const { funcName, queryName } = parsed.data as {
    funcName: string;
    queryName: string;
  };
  return extractionResults[funcName]?.[`${funcName}(${queryName})`];
}

export function useFormulaExecution(
  formula: string,
  queries: QueriesMap,
  queriesVersion?: number,
  namedExpressions?: Record<string, number | string>,
) {
  const locale = useLocale();
  const [result, setResult] = useState<number | string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function executeFormula() {
      let hfInstance: ReturnType<typeof HyperFormula.buildEmpty> | null = null;

      if (!formula || !formula.startsWith('=')) {
        setResult(null);
        setError('Formula must start with =');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Extract QUERY() and QUERY_COUNT() function calls
        const queryMatches = Array.from(
          formula.matchAll(/QUERY\s*\(\s*["']([^"']+)["']\s*\)/gi),
        );
        const queryCountMatches = Array.from(
          formula.matchAll(/QUERY_COUNT\s*\(\s*["']([^"']+)["']\s*\)/gi),
        );

        // Fetch data for each query
        const queryData: Record<string, number> = {};
        const queryCountData: Record<string, number> = {};

        // Deduplicate names (a query can appear multiple times in the same formula)
        const queryNames = Array.from(new Set(queryMatches.map(m => m[1])));
        const queryCountNames = Array.from(
          new Set(queryCountMatches.map(m => m[1])),
        );

        // Extract QUERY_EXTRACT_* calls for evaluation
        // These extraction functions are used as parameters to BUDGET_QUERY
        const extractionFunctions = {
          QUERY_EXTRACT_CATEGORIES:
            /QUERY_EXTRACT_CATEGORIES\s*\(\s*["']([^"']+)["']\s*\)/gi,
          QUERY_EXTRACT_TIMEFRAME_START:
            /QUERY_EXTRACT_TIMEFRAME_START\s*\(\s*["']([^"']+)["']\s*\)/gi,
          QUERY_EXTRACT_TIMEFRAME_END:
            /QUERY_EXTRACT_TIMEFRAME_END\s*\(\s*["']([^"']+)["']\s*\)/gi,
        };

        // Store extraction results
        const extractionResults: Record<string, Record<string, unknown>> = {
          QUERY_EXTRACT_CATEGORIES: {},
          QUERY_EXTRACT_TIMEFRAME_START: {},
          QUERY_EXTRACT_TIMEFRAME_END: {},
        };

        // Evaluate extraction functions first
        for (const [funcName, regex] of Object.entries(extractionFunctions)) {
          const matches = Array.from(formula.matchAll(regex));
          for (const match of matches) {
            const queryName = match[1];
            const key = `${funcName}(${queryName})`;

            if (!extractionResults[funcName][key]) {
              try {
                if (funcName === 'QUERY_EXTRACT_CATEGORIES') {
                  extractionResults[funcName][key] =
                    await extractQueryCategories(queryName, queries);
                } else if (funcName === 'QUERY_EXTRACT_TIMEFRAME_START') {
                  extractionResults[funcName][key] =
                    await extractQueryTimeframeStart(queryName, queries);
                } else if (funcName === 'QUERY_EXTRACT_TIMEFRAME_END') {
                  extractionResults[funcName][key] =
                    await extractQueryTimeframeEnd(queryName, queries);
                }
              } catch (err) {
                console.error(
                  `Error evaluating ${funcName}(${queryName})`,
                  err,
                );
                extractionResults[funcName][key] = null;
              }
            }
          }
        }

        // Match BUDGET_QUERY(dimension, param1, param2, param3) where each param can be:
        // extraction function, array literal {...}, or string "..."
        const paramPattern = String.raw`(?:QUERY_EXTRACT_\w+\s*\([^)]*\)|\{[^}]*\}|["'][^"']*["'])`;
        const budgetMatches = Array.from(
          formula.matchAll(
            new RegExp(
              `BUDGET_QUERY\\s*\\(\\s*["']([^"']+)["']\\s*,\\s*(${paramPattern})\\s*,\\s*(${paramPattern})\\s*,\\s*(${paramPattern})\\s*\\)`,
              'gi',
            ),
          ),
        );

        for (const queryName of queryNames) {
          const queryConfig = queries[queryName];

          if (!queryConfig) {
            console.warn(`Query "${queryName}" not found in queries config`);
            queryData[queryName] = 0;
            continue;
          }

          const data = await fetchQuerySum(queryConfig);
          queryData[queryName] = integerToAmount(data, 2);
        }

        for (const queryName of queryCountNames) {
          const queryConfig = queries[queryName];

          if (!queryConfig) {
            console.warn(`Query "${queryName}" not found in queries config`);
            queryCountData[queryName] = 0;
            continue;
          }

          const count = await fetchQueryCount(queryConfig);
          queryCountData[queryName] = count;
        }

        // Replace QUERY() and QUERY_COUNT() calls with actual values in the formula
        let processedFormula = formula;
        for (const [queryName, value] of Object.entries(queryData)) {
          const regex = new RegExp(
            `QUERY\\s*\\(\\s*["']${escapeRegExp(queryName)}["']\\s*\\)`,
            'gi',
          );
          processedFormula = processedFormula.replace(regex, String(value));
        }
        for (const [queryName, value] of Object.entries(queryCountData)) {
          const regex = new RegExp(
            `QUERY_COUNT\\s*\\(\\s*["']${escapeRegExp(queryName)}["']\\s*\\)`,
            'gi',
          );
          processedFormula = processedFormula.replace(regex, String(value));
        }

        // Process BUDGET_QUERY BEFORE replacing extraction functions
        // This ensures we match BUDGET_QUERY with extraction functions still intact
        if (budgetMatches.length > 0) {
          for (const match of budgetMatches) {
            const dimension = match[1];
            const param1Str = match[2].trim();
            const param2Str = match[3].trim();
            const param3Str = match[4].trim();

            try {
              // Parse and resolve parameters
              const param1 = resolveBudgetParam(
                parseBudgetParam(param1Str),
                extractionResults,
              );
              const param2 = resolveBudgetParam(
                parseBudgetParam(param2Str),
                extractionResults,
              );
              const param3 = resolveBudgetParam(
                parseBudgetParam(param3Str),
                extractionResults,
              );

              // Validate resolved parameters
              if (
                !Array.isArray(param1) ||
                typeof param2 !== 'string' ||
                typeof param3 !== 'string'
              ) {
                console.error(
                  'Failed to resolve BUDGET_QUERY parameters:',
                  param1Str,
                  param2Str,
                  param3Str,
                );
                continue;
              }

              // Evaluate BUDGET_QUERY
              const val = await fetchBudgetDimensionValueDirect(
                dimension,
                param1 as string[],
                param2 as string,
                param3 as string,
              );

              processedFormula = processedFormula.replace(
                match[0],
                String(val),
              );
            } catch (err) {
              console.error('Error evaluating BUDGET_QUERY', err);
            }
          }
        }

        // NOW replace remaining QUERY_EXTRACT_* functions with their evaluated values
        // (any that weren't consumed by BUDGET_QUERY)
        for (const [funcName, regex] of Object.entries(extractionFunctions)) {
          const matches = Array.from(processedFormula.matchAll(regex));
          for (const match of matches) {
            const queryName = match[1];
            const key = `${funcName}(${queryName})`;
            const value = extractionResults[funcName][key];

            if (value !== null && value !== undefined) {
              const escapedQueryName = escapeRegExp(queryName);
              const replacementRegex = new RegExp(
                `${funcName}\\s*\\(\\s*["']${escapedQueryName}["']\\s*\\)`,
                'gi',
              );

              // Format the replacement value based on type
              let replacement: string;
              if (Array.isArray(value)) {
                // For arrays, convert to HyperFormula array literal
                replacement = `{${value.map(v => `"${v}"`).join(';')}}`;
              } else if (typeof value === 'string') {
                // For strings, wrap in quotes
                replacement = `"${value}"`;
              } else {
                // For numbers
                replacement = String(value);
              }

              processedFormula = processedFormula.replace(
                replacementRegex,
                replacement,
              );
            }
          }
        }

        // Create HyperFormula instance
        hfInstance = HyperFormula.buildEmpty({
          licenseKey: 'gpl-v3',
          language: 'enUS',
          localeLang: typeof locale === 'string' ? locale : 'en-US',
          dateFormats: ['DD/MM/YYYY', 'YYYY-MM-DD', 'YYYY/MM/DD'],
        });

        // Add a sheet and set the formula in cell A1
        const sheetName = hfInstance.addSheet('Sheet1');
        const sheetId = hfInstance.getSheetId(sheetName);

        if (sheetId === undefined) {
          throw new Error('Failed to create sheet');
        }

        // Add named expressions if provided
        if (namedExpressions) {
          for (const [name, value] of Object.entries(namedExpressions)) {
            hfInstance.addNamedExpression(
              name,
              typeof value === 'number' ? value : String(value),
            );
          }
        }

        // Set the formula
        hfInstance.setCellContents({ sheet: sheetId, col: 0, row: 0 }, [
          [processedFormula],
        ]);

        // Get the result
        const cellValue = hfInstance.getCellValue({
          sheet: sheetId,
          col: 0,
          row: 0,
        });

        if (cancelled) return;

        // Check if there's an error
        if (cellValue && typeof cellValue === 'object' && 'type' in cellValue) {
          setError(`Formula error: ${cellValue.type}`);
          setResult(null);
        } else {
          setResult(cellValue as number | string);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Formula execution error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setResult(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }

        try {
          hfInstance?.destroy();
        } catch (err) {
          console.error('Error destroying HyperFormula instance:', err);
          setError('Error destroying HyperFormula instance');
          setResult(null);
        }
      }
    }

    void executeFormula();

    return () => {
      cancelled = true;
    };
  }, [formula, queriesVersion, locale, queries, namedExpressions]);

  return { result, isLoading, error };
}

// Helper function to convert timeFrame mode to condition string for getLiveRange
function timeFrameModeToCondition(mode: TimeFrame['mode']): string | null {
  // Map timeFrame modes to ReportOptions condition strings
  switch (mode) {
    case 'full':
      return 'All time';
    case 'lastMonth':
      return 'Last month';
    case 'lastYear':
      return 'Last year';
    case 'yearToDate':
      return 'Year to date';
    case 'priorYearToDate':
      return 'Prior year to date';
    case 'sliding-window':
      // sliding-window requires actual start/end dates, not a condition
      return null;
    case 'static':
      // static mode uses manually set start/end dates, not a condition
      return null;
    default:
      return null;
  }
}

function isMonthOnlyDate(s: string) {
  // YYYY-MM
  return s.includes('-') && s.split('-').length === 2;
}

function toMonth(dateOrMonth: string) {
  return isMonthOnlyDate(dateOrMonth)
    ? dateOrMonth
    : monthUtils.monthFromDate(dateOrMonth);
}

async function buildFilteredTransactionsQuery(
  config: QueryConfig,
): Promise<Query> {
  const conditions = config.conditions || [];
  const conditionsOp = config.conditionsOp || 'and';
  const timeFrame = config.timeFrame;

  // Convert conditions to query filters
  const { filters: queryFilters } = await send('make-filters-from-conditions', {
    conditions,
  });

  const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';

  // Start building the query
  let transQuery = q('transactions');

  // Add date range filter if provided
  if (timeFrame && timeFrame.mode) {
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (
      (timeFrame.mode === 'sliding-window' || timeFrame.mode === 'static') &&
      timeFrame.start &&
      timeFrame.end
    ) {
      if (timeFrame.mode === 'sliding-window') {
        // Sliding-window should move with time. Interpret start/end as a window length
        // (in months) and always anchor the end to the current month/day.
        const startMonth = toMonth(timeFrame.start);
        const endMonth = toMonth(timeFrame.end);
        const offset = monthUtils.differenceInCalendarMonths(
          endMonth,
          startMonth,
        );

        const liveEndMonth = monthUtils.currentMonth();
        const liveStartMonth = monthUtils.subMonths(liveEndMonth, offset);

        startDate = monthUtils.firstDayOfMonth(liveStartMonth);
        endDate = monthUtils.currentDay();
      } else {
        // Static mode: use the actual stored start/end dates.
        // Convert month format (YYYY-MM) to full date format (YYYY-MM-DD) if needed
        startDate = isMonthOnlyDate(timeFrame.start)
          ? timeFrame.start + '-01'
          : timeFrame.start;
        endDate = isMonthOnlyDate(timeFrame.end)
          ? monthUtils.getMonthEnd(timeFrame.end + '-01')
          : timeFrame.end;
      }
    } else {
      // For other modes, use getLiveRange with the appropriate condition
      const condition = timeFrameModeToCondition(timeFrame.mode);
      if (condition) {
        // Get earliest and latest transactions for getLiveRange
        const earliestTransaction = await send('get-earliest-transaction');
        const latestTransaction = await send('get-latest-transaction');

        const earliestDate = earliestTransaction
          ? earliestTransaction.date
          : monthUtils.currentDay();
        const latestDate = latestTransaction
          ? latestTransaction.date
          : monthUtils.currentDay();

        const [calculatedStart, calculatedEnd] = getLiveRange(
          condition,
          earliestDate,
          latestDate,
          true, // includeCurrentInterval
        );

        startDate = calculatedStart;
        endDate = calculatedEnd;
      } else {
        // No valid condition found, skip date filtering entirely
        // Continue without adding date filter
      }
    }

    // Apply the date filter only if we have valid dates
    if (startDate && endDate) {
      transQuery = transQuery.filter({
        $and: [{ date: { $gte: startDate } }, { date: { $lte: endDate } }],
      });
    }
  }

  // Add user-defined filters
  if (queryFilters.length > 0) {
    transQuery = transQuery.filter({ [conditionsOpKey]: queryFilters });
  }

  return transQuery;
}

async function fetchQuerySum(config: QueryConfig): Promise<number> {
  try {
    const transQuery = await buildFilteredTransactionsQuery(config);
    const summedQuery = transQuery.calculate({ $sum: '$amount' });
    const { data } = await send('query', summedQuery.serialize());
    return data || 0;
  } catch (err) {
    console.error('Error fetching query sum:', err);
    return 0;
  }
}

async function fetchQueryCount(config: QueryConfig): Promise<number> {
  try {
    const transQuery = await buildFilteredTransactionsQuery(config);
    const countQuery = transQuery.calculate({ $count: '*' });
    const { data } = await send('query', countQuery.serialize());
    return data || 0;
  } catch (err) {
    console.error('Error fetching query count:', err);
    return 0;
  }
}

// Helper: Extract category-based conditions (ignore transaction-specific filters)
function extractCategoryConditions(
  conditions: RuleConditionEntity[],
): RuleConditionEntity[] {
  return conditions.filter(
    cond => !cond.customName && cond.field === 'category',
  );
}

// Helper: Evaluate category conditions to get matching categories
async function getCategoriesFromConditions(
  allCategories: CategoryEntity[],
  conditions: RuleConditionEntity[],
  conditionsOp: 'and' | 'or',
): Promise<string[]> {
  if (conditions.length === 0) {
    // No category filter: include all non-income, non-hidden categories
    return allCategories
      .filter((cat: CategoryEntity) => !cat.is_income && !cat.hidden)
      .map((cat: CategoryEntity) => cat.id);
  }

  // Evaluate each condition to get sets of matching categories
  const conditionResults = conditions.map(cond => {
    const matching = allCategories.filter((cat: CategoryEntity) => {
      if (cond.op === 'is') {
        return cond.value === cat.id;
      } else if (cond.op === 'isNot') {
        return cond.value !== cat.id;
      } else if (cond.op === 'oneOf') {
        return cond.value.includes(cat.id);
      } else if (cond.op === 'notOneOf') {
        return !cond.value.includes(cat.id);
      } else if (cond.op === 'contains') {
        return cat.name.includes(cond.value as string);
      } else if (cond.op === 'doesNotContain') {
        return !cat.name.includes(cond.value as string);
      } else if (cond.op === 'matches') {
        try {
          return new RegExp(cond.value as string).test(cat.name);
        } catch (e) {
          console.warn('Invalid regexp in matches condition', e);
          return true;
        }
      }
      // Unknown operator: include category by default and log warning
      console.warn(`Unknown category condition operator: ${cond.op}`);
      return true;
    });
    return matching.map((cat: CategoryEntity) => cat.id);
  });

  if (conditionsOp === 'or') {
    // OR: Union of all matching categories
    const categoryIds = new Set(conditionResults.flat());
    return Array.from(categoryIds);
  } else {
    // AND: Intersection of all matching categories
    if (conditionResults.length === 0) {
      return [];
    }
    const firstSet = new Set(conditionResults[0]);
    for (let i = 1; i < conditionResults.length; i++) {
      const currentIds = new Set(conditionResults[i]);
      // Keep only categories that are in both sets
      const toRemove: string[] = [];
      firstSet.forEach(id => {
        if (!currentIds.has(id)) {
          toRemove.push(id);
        }
      });
      toRemove.forEach(id => firstSet.delete(id));
    }
    return Array.from(firstSet);
  }
}

// Helper: Get month data from envelope-budget-month RPC
async function getMonthBudgetData(
  month: string,
): Promise<Array<{ name: string; value: string | number | boolean }>> {
  const monthData = await send('envelope-budget-month', { month });
  return monthData || [];
}

// Helper: Extract value from month data by field pattern
function getMonthDataValue(
  monthData: Array<{ name: string; value: string | number | boolean }>,
  pattern: string,
  catId: string,
): string | number | boolean {
  const fieldName = pattern.replace('{catId}', catId);
  const cell = monthData.find(c => c.name.endsWith(fieldName));
  return cell?.value ?? 0;
}

// Helper: Extract categories from a named query (for QUERY_EXTRACT_CATEGORIES)
async function extractQueryCategories(
  queryName: string,
  queries: QueriesMap,
): Promise<string[]> {
  const queryConfig = queries[queryName];
  if (!queryConfig) {
    console.warn(`Query "${queryName}" not found in queries config`);
    return [];
  }

  const categoryConditions = extractCategoryConditions(
    queryConfig.conditions || [],
  );
  const { list: allCategories } = await send('get-categories');
  return getCategoriesFromConditions(
    allCategories,
    categoryConditions,
    queryConfig.conditionsOp || 'and',
  );
}

// Helper: Extract timeframe start month from a named query (for QUERY_EXTRACT_TIMEFRAME_START)
async function extractQueryTimeframeStart(
  queryName: string,
  queries: QueriesMap,
): Promise<string> {
  const queryConfig = queries[queryName];
  if (!queryConfig || !queryConfig.timeFrame) {
    console.warn(
      `Query "${queryName}" not found or has no timeframe; cannot extract start`,
    );
    return monthUtils.currentMonth();
  }

  const [startMonth] = calculateTimeRange(queryConfig.timeFrame);
  return startMonth;
}

// Helper: Extract timeframe end month from a named query (for QUERY_EXTRACT_TIMEFRAME_END)
async function extractQueryTimeframeEnd(
  queryName: string,
  queries: QueriesMap,
): Promise<string> {
  const queryConfig = queries[queryName];
  if (!queryConfig || !queryConfig.timeFrame) {
    console.warn(
      `Query "${queryName}" not found or has no timeframe; cannot extract end`,
    );
    return monthUtils.currentMonth();
  }

  const [, endMonth] = calculateTimeRange(queryConfig.timeFrame);
  return endMonth;
}

// Helper: Evaluate budget dimension with already-extracted parameters (used by compositional BUDGET_QUERY)
async function fetchBudgetDimensionValueDirect(
  dimension: string,
  categoryIds: string[],
  startMonth: string,
  endMonth: string,
): Promise<number> {
  const allowed = new Set([
    'budgeted',
    'spent',
    'balance_start',
    'balance_end',
    'goal',
  ]);
  const dim = dimension.toLowerCase();
  if (!allowed.has(dim)) {
    throw new Error(`Invalid BUDGET_QUERY dimension: ${dimension}`);
  }

  const intervals = monthUtils.rangeInclusive(startMonth, endMonth);

  // Helper: sum a dimension across all months/categories
  const sumDimension = async (fieldPattern: string): Promise<number> => {
    let total = 0;
    for (const month of intervals) {
      const monthData = await getMonthBudgetData(month);
      for (const catId of categoryIds) {
        total += getMonthDataValue(monthData, fieldPattern, catId) as number;
      }
    }
    return total;
  };

  if (dim === 'budgeted') {
    return integerToAmount(await sumDimension('budget-{catId}'), 2);
  }

  if (dim === 'spent') {
    return integerToAmount(await sumDimension('sum-amount-{catId}'), 2);
  }

  if (dim === 'goal') {
    return integerToAmount(await sumDimension('goal-{catId}'), 2);
  }

  // Handle balance dimensions: chain month-by-month with carryover logic
  if (dim === 'balance_start' || dim === 'balance_end') {
    let runningBalance = 0;
    const monthBeforeStart = monthUtils.subMonths(startMonth, 1);
    const prevMonthData = await getMonthBudgetData(monthBeforeStart);

    for (const catId of categoryIds) {
      const catBalance = getMonthDataValue(
        prevMonthData,
        'leftover-{catId}',
        catId,
      ) as number;
      const hasCarryover = Boolean(
        getMonthDataValue(prevMonthData, 'carryover-{catId}', catId),
      );
      if (catBalance > 0 || (catBalance < 0 && hasCarryover)) {
        runningBalance += catBalance;
      }
    }

    const balances: Record<string, { start: number; end: number }> = {};

    for (const month of intervals) {
      const monthData = await getMonthBudgetData(month);
      let budgeted = 0;
      let spent = 0;
      let carryoverToNextMonth = 0;

      for (const catId of categoryIds) {
        const catBudgeted =
          Number(getMonthDataValue(monthData, 'budget-{catId}', catId)) || 0;
        const catSpent =
          Number(getMonthDataValue(monthData, 'sum-amount-{catId}', catId)) ||
          0;
        const catBalance =
          Number(getMonthDataValue(monthData, 'leftover-{catId}', catId)) || 0;
        const hasCarryover = Boolean(
          getMonthDataValue(monthData, 'carryover-{catId}', catId),
        );

        budgeted += catBudgeted;
        spent += catSpent;

        if (catBalance > 0 || (catBalance < 0 && hasCarryover)) {
          carryoverToNextMonth += catBalance;
        }
      }

      const balanceStart = runningBalance;
      const balanceEnd = budgeted + spent + runningBalance;

      balances[month] = { start: balanceStart, end: balanceEnd };
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

  return 0;
}
