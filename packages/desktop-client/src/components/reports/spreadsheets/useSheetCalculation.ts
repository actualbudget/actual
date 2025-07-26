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
  currentRowRef?: string, // Add current row reference to detect self-references
): number | string {
  const [result, setResult] = useState<number | string>(0);
  const [isLoading, setIsLoading] = useState(false);

  // Use ref to store current cellGrid to avoid dependency issues
  const cellGridRef = useRef(cellGrid);
  cellGridRef.current = cellGrid;

  // Create a stable reference to cellGrid data to prevent infinite loops
  const stableCellGrid = useMemo(() => {
    if (!cellGrid) return null;
    return JSON.stringify(cellGrid);
  }, [cellGrid]);

  // Memoize the getCellValue function to prevent infinite loops and detect circular references
  const getCellValue = useCallback(
    (ref: string) => {
      const currentCellGrid = cellGridRef.current;
      if (!currentCellGrid) return 0;
      if (currentRowRef && ref === currentRowRef) {
        return 'Error: Self-reference detected';
      }
      // Recursively evaluate the referenced cell
      return evaluateCell(ref, currentCellGrid, new Set([currentRowRef || '']));
    },
    [currentRowRef],
  );

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
            currentRowRef,
          );
          if (!cancelled) {
            setResult(
              typeof asyncResult === 'number'
                ? asyncResult
                : String(asyncResult),
            );
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
            setResult(
              typeof syncResult === 'number' ? syncResult : String(syncResult),
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            'useSheetCalculation: Formula evaluation error:',
            error,
          );
          const message =
            error instanceof Error ? error.message : 'Unknown error';
          // Avoid double 'Error:'
          if (typeof message === 'string' && message.startsWith('Error:')) {
            setResult(message);
          } else {
            setResult(`Error: ${message}`);
          }
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
  }, [formula, stableCellGrid, getCellValue, currentRowRef]);

  return isLoading ? '...' : result;
}

/**
 * Recursively evaluate a cell, tracking visited references to detect circular/self-references.
 */
function evaluateCell(
  ref: string,
  cellGrid: CellGrid,
  visited: Set<string>,
): number | string {
  if (visited.has(ref)) {
    return 'Error: Circular reference detected';
  }
  visited.add(ref);

  const value = cellGrid[ref];
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    if (value.startsWith('Error:')) {
      return value;
    }
    // If value is a formula (starts with =), evaluate it recursively
    if (value.trim().startsWith('=')) {
      const formula = value.trim().slice(1);
      try {
        const result = evaluateFormula(formula, {
          cost: () => 0,
          balance: () => 0,
          fifo: () => 0,
          negate: () => 0,
          queryRunner: () => 0,
          getCellValue: (innerRef: string) => {
            if (innerRef === ref) {
              return 'Error: Self-reference detected';
            }
            // Create a new visited set to avoid modifying the original
            const newVisited = new Set(visited);
            return evaluateCell(innerRef, cellGrid, newVisited);
          },
        });
        return typeof result === 'number' ? result : String(result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        if (typeof message === 'string' && message.startsWith('Error:')) {
          return message;
        } else {
          return `Error: ${message}`;
        }
      }
    }
    // Otherwise, try to parse as a number
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Process formulas that contain async operations
 */
async function processAsyncFormula(
  formula: string,
  cellGrid?: CellGrid,
  currentRowRef?: string,
): Promise<number | string> {
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
        if (!cellGrid) return 0;
        if (currentRowRef && ref === currentRowRef) {
          return 'Error: Self-reference detected';
        }
        // Use the same recursive evaluation logic as the main getCellValue
        return evaluateCell(ref, cellGrid, new Set([currentRowRef || '']));
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

    return typeof finalResult === 'number' ? finalResult : String(finalResult);
  } catch (error) {
    console.error('Final formula evaluation error:', error);
    return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Check if a formula contains a self-reference
 */
export function hasSelfReference(
  formula: string,
  currentRowRef: string,
): boolean {
  if (!formula || !currentRowRef) return false;

  const cleanFormula = formula.startsWith('=') ? formula.slice(1) : formula;

  // Check for direct self-reference
  if (cleanFormula.includes(currentRowRef)) {
    return true;
  }

  return false;
}

/**
 * Check if a formula contains circular references by analyzing cell references
 * Note: This function is for static analysis and may be expensive for large spreadsheets.
 * Consider using it only for validation, not for real-time checking.
 */
export function hasCircularReference(
  formula: string,
  cellGrid: CellGrid,
  currentRowRef: string,
  visited: Set<string> = new Set(),
  originalRowRef?: string,
): boolean {
  if (!formula || !currentRowRef) return false;

  // Use the original row reference for the first call, then current row reference for recursive calls
  const targetRowRef = originalRowRef || currentRowRef;

  const cleanFormula = formula.startsWith('=') ? formula.slice(1) : formula;

  // Extract all cell references from the formula
  const cellRefRegex = /row-\d+/g;
  const cellRefs = cleanFormula.match(cellRefRegex) || [];

  for (const ref of cellRefs) {
    // Skip if we've already visited this reference to avoid infinite recursion
    if (visited.has(ref)) {
      continue;
    }

    // Check if this reference points to a formula that references back to the target row
    if (cellGrid[ref] && typeof cellGrid[ref] === 'string') {
      const refFormula = cellGrid[ref] as string;

      // If the referenced formula contains the target row, it's a circular reference
      if (refFormula.includes(targetRowRef)) {
        return true;
      }

      // Recursively check for deeper circular references
      const newVisited = new Set(visited);
      newVisited.add(ref);

      if (
        hasCircularReference(
          refFormula,
          cellGrid,
          ref,
          newVisited,
          targetRowRef,
        )
      ) {
        return true;
      }
    }
  }

  return false;
}
