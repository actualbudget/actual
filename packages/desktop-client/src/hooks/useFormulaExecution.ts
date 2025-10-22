import { useState, useEffect } from 'react';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import { integerToAmount } from 'loot-core/shared/util';
import {
  type RuleConditionEntity,
  type TimeFrame,
} from 'loot-core/types/models';

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
      const { HyperFormula } = await import('hyperformula');
      let hfInstance: ReturnType<typeof HyperFormula.buildEmpty> | null = null;

      if (!formula || !formula.startsWith('=')) {
        setResult(null);
        setError('Formula must start with =');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Extract QUERY() function calls
        const queryMatches = Array.from(
          formula.matchAll(/QUERY\s*\(\s*["']([^"']+)["']\s*\)/gi),
        );

        // Fetch data for each query
        const queryData: Record<string, number> = {};

        for (const match of queryMatches) {
          const queryName = match[1];
          const queryConfig = queries[queryName];

          if (!queryConfig) {
            console.warn(`Query “${queryName}” not found in queries config`);
            queryData[queryName] = 0;
            continue;
          }

          // Fetch the actual transaction data based on the query config
          // For now, we'll use a simplified approach
          // In a real implementation, this would call a backend API
          const data = await fetchQueryData(queryConfig);
          queryData[queryName] = integerToAmount(data, 2);
        }

        // Replace QUERY() calls with actual values in the formula
        let processedFormula = formula;
        for (const [queryName, value] of Object.entries(queryData)) {
          const regex = new RegExp(
            `QUERY\\s*\\(\\s*["']${escapeRegExp(queryName)}["']\\s*\\)`,
            'gi',
          );
          processedFormula = processedFormula.replace(regex, String(value));
        }

        // Create HyperFormula instance
        hfInstance = HyperFormula.buildEmpty({
          licenseKey: 'gpl-v3',
          localeLang: typeof locale === 'string' ? locale : 'en-US',
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

    executeFormula();

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

// Helper function to fetch query data
async function fetchQueryData(config: QueryConfig): Promise<number> {
  try {
    const conditions = config.conditions || [];
    const conditionsOp = config.conditionsOp || 'and';
    const timeFrame = config.timeFrame;

    // Convert conditions to query filters
    const { filters: queryFilters } = await send(
      'make-filters-from-conditions',
      {
        conditions,
      },
    );

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
        // For sliding-window and static modes, use the actual start/end dates from timeFrame
        // Convert month format (YYYY-MM) to full date format (YYYY-MM-DD) if needed
        startDate =
          timeFrame.start.includes('-') &&
          timeFrame.start.split('-').length === 2
            ? timeFrame.start + '-01'
            : timeFrame.start;
        endDate =
          timeFrame.end.includes('-') && timeFrame.end.split('-').length === 2
            ? monthUtils.getMonthEnd(timeFrame.end + '-01')
            : timeFrame.end;
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

    // Calculate sum
    transQuery = transQuery.calculate({ $sum: '$amount' });

    const { data } = await send('query', transQuery.serialize());
    return data || 0;
  } catch (err) {
    console.error('Error fetching query data:', err);
    return 0;
  }
}
