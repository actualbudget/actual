import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

import { q } from 'loot-core/shared/query';

import { parseQueryFilters } from './queryParser';
import { evaluateFormula } from './sheetEngine';

import { aqlQuery } from '@desktop-client/queries/aqlQuery';

type AsyncMatch = {
  match: string;
  placeholder: string;
  value: number;
};

type CellGrid = {
  [key: string]: number | string; // e.g., { "row-1": 100, "row-2": "hello", "row-3": 250 }
};

/**
 * Hook that evaluates a spreadsheet formula string and returns the result.
 *
 * Supports real data queries through cost(), balance(), and queryRunner functions,
 * as well as cell references like row-1, row-2, etc.
 */
export function useSheetCalculation(
  formula: string,
  cellGrid?: CellGrid,
): number | unknown {
  const [result, setResult] = useState<number | unknown>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Use ref to store current cellGrid to avoid dependency issues
  const cellGridRef = useRef(cellGrid);
  cellGridRef.current = cellGrid;

  // Create a stable reference to cellGrid data to prevent infinite loops
  const stableCellGrid = useMemo(() => {
    if (!cellGrid) return null;
    return JSON.stringify(cellGrid);
  }, [cellGrid]);

  // Memoize the getCellValue function to prevent infinite loops
  const getCellValue = useCallback((ref: string) => {
    const currentCellGrid = cellGridRef.current;
    if (currentCellGrid && currentCellGrid[ref] !== undefined) {
      const value = currentCellGrid[ref];
      return typeof value === 'number' ? value : parseFloat(String(value)) || 0;
    }
    return 0;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function evaluateAsyncFormula() {
      if (!formula.trim()) {
        setResult(0);
        return;
      }

      // Remove leading '=' if present
      const cleanFormula = formula.startsWith('=') ? formula.slice(1) : formula;

      setIsLoading(true);

      try {
        // Check if the formula contains async operations (cost, balance, or queries)
        const hasAsyncOps =
          cleanFormula.includes('cost(') ||
          cleanFormula.includes('balance(') ||
          cleanFormula.includes('{');

        if (hasAsyncOps) {
          // Handle async evaluation
          const asyncResult = await processAsyncFormula(
            cleanFormula,
            cellGridRef.current,
          );
          if (!cancelled) {
            setResult(asyncResult);
          }
        } else {
          // Handle synchronous evaluation (basic math + cell references)
          const syncResult = evaluateFormula(cleanFormula, {
            cost: () => 0,
            balance: () => 0,
            fifo: () => 0,
            negate: () => 0,
            queryRunner: () => 0,
            getCellValue,
          });
          if (!cancelled) {
            setResult(syncResult);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            'useSheetCalculation: Formula evaluation error:',
            error,
          );
          setResult(
            `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    evaluateAsyncFormula();

    return () => {
      cancelled = true;
    };
  }, [formula, stableCellGrid, getCellValue]);

  return isLoading ? '...' : result;
}

/**
 * Process formulas that contain async operations
 */
async function processAsyncFormula(
  formula: string,
  cellGrid?: CellGrid,
): Promise<number | unknown> {
  // Create a cache for async results
  const asyncCache = new Map<string, number>();

  // Replace async function calls with placeholders, evaluate them, then substitute back
  let processedFormula = formula;
  const asyncMatches: AsyncMatch[] = [];

  let placeholderIndex = 0;

  // Find all cost() function calls
  const costRegex = /cost\(\s*\{\s*([^}]*)\s*\}\s*\)/g;
  let match;

  while ((match = costRegex.exec(formula)) !== null) {
    const [fullMatch, queryString] = match;
    const placeholder = `__ASYNC_${placeholderIndex++}__`;

    if (!asyncCache.has(fullMatch)) {
      try {
        // Parse query string using shared utility
        const filters = await parseQueryFilters(queryString);

        const result = await aqlQuery(
          q('transactions').filter(filters).calculate({ $sum: '$amount' }),
        );

        // Convert to positive value and from cents to dollars
        const value = Math.abs(result.data || 0) / 100;
        asyncCache.set(fullMatch, value);
      } catch (error) {
        console.error('Cost query error:', error);
        asyncCache.set(fullMatch, 0);
      }
    }

    const value = asyncCache.get(fullMatch) || 0;
    asyncMatches.push({ match: fullMatch, placeholder, value });
    processedFormula = processedFormula.replace(fullMatch, placeholder);
  }

  // Find all balance() function calls
  const balanceRegex = /balance\(\s*"([^"]+)"\s*\)/g;
  while ((match = balanceRegex.exec(formula)) !== null) {
    const [fullMatch, accountName] = match;
    const placeholder = `__ASYNC_${placeholderIndex++}__`;

    if (!asyncCache.has(fullMatch)) {
      try {
        const { send } = await import('loot-core/platform/client/fetch');
        const accounts = await send('accounts-get');
        const account = accounts.find(
          (acc: { id: string; name: string }) => acc.name === accountName,
        );

        if (account) {
          const balance = await aqlQuery(
            q('transactions')
              .filter({ account: account.id })
              .calculate({ $sum: '$amount' }),
          );

          const value = (balance.data || 0) / 100;
          asyncCache.set(fullMatch, value);
        } else {
          console.warn('Account not found:', accountName);
          asyncCache.set(fullMatch, 0);
        }
      } catch (error) {
        console.error('Balance query error:', error);
        asyncCache.set(fullMatch, 0);
      }
    }

    const value = asyncCache.get(fullMatch) || 0;
    asyncMatches.push({ match: fullMatch, placeholder, value });
    processedFormula = processedFormula.replace(fullMatch, placeholder);
  }

  // Find all query blocks (simple version)
  const queryRegex = /\{\s*([^}]*)\s*\}/g;

  while ((match = queryRegex.exec(processedFormula)) !== null) {
    const [fullMatch, queryString] = match;
    const placeholder = `__ASYNC_${placeholderIndex++}__`;

    if (!asyncCache.has(fullMatch)) {
      try {
        // Parse query string using shared utility
        const filters = await parseQueryFilters(queryString);

        const result = await aqlQuery(
          q('transactions').filter(filters).calculate({ $sum: '$amount' }),
        );

        const value = Math.abs(result.data || 0) / 100;
        asyncCache.set(fullMatch, value);
      } catch (error) {
        console.error('Query block error:', error);
        asyncCache.set(fullMatch, 0);
      }
    }

    const value = asyncCache.get(fullMatch) || 0;
    asyncMatches.push({ match: fullMatch, placeholder, value });
    processedFormula = processedFormula.replace(fullMatch, placeholder);
  }

  // Now evaluate the processed formula with placeholders replaced by actual values

  try {
    // Handle case where the entire formula is just a single query block
    if (
      asyncMatches.length === 1 &&
      processedFormula.trim() === asyncMatches[0].placeholder
    ) {
      return asyncMatches[0].value;
    }

    const finalResult = evaluateFormula(processedFormula, {
      cost: () => 0,
      balance: () => 0,
      fifo: () => 0,
      negate: () => 0,
      queryRunner: () => 0,
      getCellValue: (ref: string) => {
        if (cellGrid && cellGrid[ref] !== undefined) {
          const value = cellGrid[ref];
          return typeof value === 'number'
            ? value
            : parseFloat(String(value)) || 0;
        }
        return 0;
      },
      lookupIdentifier: (name: string) => {
        // Check if this is one of our async placeholders
        const asyncMatch = asyncMatches.find(m => m.placeholder === name);
        if (asyncMatch) {
          return asyncMatch.value;
        }
        throw new Error(`Unknown identifier: ${name}`);
      },
    });

    return finalResult;
  } catch (error) {
    console.error('Final formula evaluation error:', error);
    return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}
