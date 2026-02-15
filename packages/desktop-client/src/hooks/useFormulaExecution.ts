import { useEffect, useState } from 'react';

import { HyperFormula } from 'hyperformula';

import { send } from 'loot-core/platform/client/connection';
import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import type { Query } from 'loot-core/shared/query';
import { integerToAmount } from 'loot-core/shared/util';
import type { RuleConditionEntity, TimeFrame } from 'loot-core/types/models';

import { useLocale } from './useLocale';

import { getLiveRange } from '@desktop-client/components/reports/getLiveRange';

type QueryConfig = {
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
  timeFrame?: TimeFrame;
};

type QueriesMap = Record<string, QueryConfig>;

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

        // Create HyperFormula instance
        hfInstance = HyperFormula.buildEmpty({
          licenseKey: 'gpl-v3',
          localeLang: typeof locale === 'string' ? locale : 'en-US',
          language: 'enUS',
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
