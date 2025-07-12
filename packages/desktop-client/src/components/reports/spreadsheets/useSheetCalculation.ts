import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

import { send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';

import { evaluateFormula } from './sheetEngine';

import { aqlQuery } from '@desktop-client/queries/aqlQuery';

// Type definitions for better type safety
type Category = {
  id: string;
  name: string;
};

type Account = {
  id: string;
  name: string;
};

type Payee = {
  id: string;
  name: string;
};

type TransactionFilters = {
  category?: string;
  account?: string;
  payee?: string;
  date?: {
    $gte?: string;
    $lt?: string;
    $lte?: string;
  };
  amount?: {
    $gte?: number;
    $lte?: number;
  };
};

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
      console.log('useSheetCalculation: Evaluating formula:', formula);

      if (!formula.trim()) {
        console.log('useSheetCalculation: Empty formula, setting result to 0');
        setResult(0);
        return;
      }

      // Remove leading '=' if present
      const cleanFormula = formula.startsWith('=') ? formula.slice(1) : formula;
      console.log('useSheetCalculation: Clean formula:', cleanFormula);

      setIsLoading(true);

      try {
        // Check if the formula contains async operations (cost, balance, or queries)
        const hasAsyncOps =
          cleanFormula.includes('cost(') ||
          cleanFormula.includes('balance(') ||
          cleanFormula.includes('{');

        if (hasAsyncOps) {
          // Handle async evaluation
          console.log(
            'useSheetCalculation: Has async operations, processing...',
          );
          const asyncResult = await processAsyncFormula(
            cleanFormula,
            cellGridRef.current,
          );
          console.log('useSheetCalculation: Async result:', asyncResult);
          if (!cancelled) {
            setResult(asyncResult);
          }
        } else {
          // Handle synchronous evaluation (basic math + cell references)
          console.log('useSheetCalculation: Synchronous evaluation');
          const syncResult = evaluateFormula(cleanFormula, {
            cost: () => 0,
            balance: () => 0,
            fifo: () => 0,
            negate: () => 0,
            queryRunner: () => 0,
            getCellValue,
          });
          console.log('useSheetCalculation: Sync result:', syncResult);
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

  console.log('DEBUG: Starting fresh calculation with empty cache');

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

    console.log('DEBUG: Processing cost() function:', fullMatch);

    if (!asyncCache.has(fullMatch)) {
      console.log(
        'DEBUG: Cache miss, calculating fresh result for:',
        fullMatch,
      );
      try {
        // Parse query string more robustly
        const filters: TransactionFilters = {};

        // Extract category
        const categoryMatch = queryString.match(/category:\s*"([^"]+)"/);
        if (categoryMatch) {
          // We need to look up the category by name to get transactions
          const categoryName = categoryMatch[1];
          const categories = await send('get-categories');

          // Try multiple matching strategies for better compatibility
          let category = categories.list.find(
            (cat: Category) => cat.name === categoryName, // Exact match first
          );

          if (!category) {
            // Try case-insensitive match
            category = categories.list.find(
              (cat: Category) =>
                cat.name.toLowerCase() === categoryName.toLowerCase(),
            );
          }

          if (!category) {
            // Try partial match (useful for emoji issues)
            category = categories.list.find(
              (cat: Category) =>
                cat.name.includes(categoryName) ||
                categoryName.includes(cat.name),
            );
          }

          if (category) {
            filters.category = category.id;
            console.log(
              'DEBUG: Found category:',
              category.name,
              'ID:',
              category.id,
            );
          } else {
            console.warn(
              'Category not found:',
              categoryName,
              'Available categories:',
              categories.list.map((c: Category) => c.name),
            );
          }
        }

        // Extract account filters
        const accountMatch = queryString.match(/account:\s*"([^"]+)"/);
        if (accountMatch) {
          const accountName = accountMatch[1];
          const accounts = await send('accounts-get');
          const account = accounts.find(
            (acc: Account) => acc.name === accountName,
          );
          if (account) {
            filters.account = account.id;
            console.log(
              'DEBUG: Found account:',
              account.name,
              'ID:',
              account.id,
            );
          } else {
            console.warn('Account not found (exact match):', accountName);
          }
        }

        // Extract payee filters
        const payeeMatch = queryString.match(/payee:\s*"([^"]+)"/);
        if (payeeMatch) {
          const payeeName = payeeMatch[1];
          const payees = await send('payees-get');
          const payee = payees.find((p: Payee) => p.name === payeeName);
          if (payee) {
            filters.payee = payee.id;
            console.log('DEBUG: Found payee:', payee.name, 'ID:', payee.id);
          } else {
            console.warn('Payee not found (exact match):', payeeName);
          }
        }

        // Extract date filters
        if (queryString.includes('date:thisMonth')) {
          filters.date = { $gte: monthUtils.currentMonth() + '-01' };
        } else if (queryString.includes('date:lastMonth')) {
          const lastMonth = monthUtils.subMonths(monthUtils.currentMonth(), 1);
          filters.date = {
            $gte: lastMonth + '-01',
            $lt: monthUtils.currentMonth() + '-01',
          };
        } else if (queryString.includes('date:thisYear')) {
          const currentYear = new Date().getFullYear();
          filters.date = { $gte: `${currentYear}-01-01` };
        } else if (queryString.includes('date:lastYear')) {
          const lastYear = new Date().getFullYear() - 1;
          filters.date = {
            $gte: `${lastYear}-01-01`,
            $lt: `${lastYear + 1}-01-01`,
          };
        } else {
          // Handle date:between, date:gte, date:lte
          const dateBetweenMatch = queryString.match(
            /date:between\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/,
          );
          if (dateBetweenMatch) {
            filters.date = {
              $gte: dateBetweenMatch[1],
              $lte: dateBetweenMatch[2],
            };
            console.log('DEBUG: Date filter applied:', filters.date);
          } else {
            const dateGteMatch = queryString.match(
              /date:gte\(\s*"([^"]+)"\s*\)/,
            );
            if (dateGteMatch) {
              filters.date = { $gte: dateGteMatch[1] };
            }

            const dateLteMatch = queryString.match(
              /date:lte\(\s*"([^"]+)"\s*\)/,
            );
            if (dateLteMatch) {
              filters.date = { ...filters.date, $lte: dateLteMatch[1] };
            }
          }
        }

        // Extract amount filters
        const amountGteMatch = queryString.match(/amount:gte\(\s*([^)]+)\s*\)/);
        if (amountGteMatch) {
          const minAmount = parseFloat(amountGteMatch[1]);
          filters.amount = { $gte: minAmount };
        }

        const amountLteMatch = queryString.match(/amount:lte\(\s*([^)]+)\s*\)/);
        if (amountLteMatch) {
          const maxAmount = parseFloat(amountLteMatch[1]);
          filters.amount = { ...filters.amount, $lte: maxAmount };
        }

        console.log('DEBUG: Applied filters:', filters);

        const result = await aqlQuery(
          q('transactions').filter(filters).calculate({ $sum: '$amount' }),
        );

        console.log('DEBUG: Raw query result:', result);
        console.log('DEBUG: Raw sum amount (cents):', result.data);
        console.log('DEBUG: After Math.abs():', Math.abs(result.data || 0));
        console.log(
          'DEBUG: Final value (dollars):',
          Math.abs(result.data || 0) / 100,
        );

        // Convert to positive value and from cents to dollars
        const value = Math.abs(result.data || 0) / 100;
        console.log('DEBUG: Caching value:', value, 'for:', fullMatch);
        asyncCache.set(fullMatch, value);
      } catch (error) {
        console.error('Cost query error:', error);
        asyncCache.set(fullMatch, 0);
      }
    } else {
      console.log('DEBUG: Using cached value for:', fullMatch);
    }

    const value = asyncCache.get(fullMatch) || 0;
    console.log('DEBUG: Retrieved value from cache:', value);
    asyncMatches.push({ match: fullMatch, placeholder, value });
    processedFormula = processedFormula.replace(fullMatch, placeholder);

    console.log(
      'DEBUG: After cost() replacement, processedFormula:',
      processedFormula,
    );
  }

  // Find all balance() function calls
  const balanceRegex = /balance\(\s*"([^"]+)"\s*\)/g;
  while ((match = balanceRegex.exec(formula)) !== null) {
    const [fullMatch, accountName] = match;
    const placeholder = `__ASYNC_${placeholderIndex++}__`;

    if (!asyncCache.has(fullMatch)) {
      try {
        const accounts = await send('accounts-get');
        const account = accounts.find(
          (acc: Account) => acc.name === accountName,
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
  console.log('DEBUG: Looking for query blocks in:', processedFormula);

  while ((match = queryRegex.exec(processedFormula)) !== null) {
    const [fullMatch, queryString] = match;
    const placeholder = `__ASYNC_${placeholderIndex++}__`;

    console.log('DEBUG: Processing query block:', fullMatch);

    if (!asyncCache.has(fullMatch)) {
      try {
        const filters: TransactionFilters = {};

        // Parse the query string for category, account, payee, date, etc.
        const categoryMatch = queryString.match(/category:\s*"([^"]+)"/);
        if (categoryMatch) {
          const categoryName = categoryMatch[1];
          const categories = await send('get-categories');

          // Try multiple matching strategies for better compatibility
          let category = categories.list.find(
            (cat: Category) => cat.name === categoryName, // Exact match first
          );

          if (!category) {
            // Try case-insensitive match
            category = categories.list.find(
              (cat: Category) =>
                cat.name.toLowerCase() === categoryName.toLowerCase(),
            );
          }

          if (!category) {
            // Try partial match (useful for emoji issues)
            category = categories.list.find(
              (cat: Category) =>
                cat.name.includes(categoryName) ||
                categoryName.includes(cat.name),
            );
          }

          if (category) {
            filters.category = category.id;
            console.log(
              'DEBUG: Found category:',
              category.name,
              'ID:',
              category.id,
            );
          } else {
            console.warn(
              'Category not found:',
              categoryName,
              'Available categories:',
              categories.list.map((c: Category) => c.name),
            );
          }
        }

        const accountMatch = queryString.match(/account:\s*"([^"]+)"/);
        if (accountMatch) {
          const accountName = accountMatch[1];
          const accounts = await send('accounts-get');
          const account = accounts.find(
            (acc: Account) => acc.name === accountName,
          );
          if (account) {
            filters.account = account.id;
            console.log(
              'DEBUG: Found account:',
              account.name,
              'ID:',
              account.id,
            );
          } else {
            console.warn('Account not found (exact match):', accountName);
          }
        }

        const payeeMatch = queryString.match(/payee:\s*"([^"]+)"/);
        if (payeeMatch) {
          const payeeName = payeeMatch[1];
          const payees = await send('payees-get');
          const payee = payees.find((p: Payee) => p.name === payeeName);
          if (payee) {
            filters.payee = payee.id;
            console.log('DEBUG: Found payee:', payee.name, 'ID:', payee.id);
          } else {
            console.warn('Payee not found (exact match):', payeeName);
          }
        }

        if (queryString.includes('date:thisMonth')) {
          filters.date = { $gte: monthUtils.currentMonth() + '-01' };
        } else if (queryString.includes('date:lastMonth')) {
          const lastMonth = monthUtils.subMonths(monthUtils.currentMonth(), 1);
          filters.date = {
            $gte: lastMonth + '-01',
            $lt: monthUtils.currentMonth() + '-01',
          };
        } else if (queryString.includes('date:thisYear')) {
          const currentYear = new Date().getFullYear();
          filters.date = { $gte: `${currentYear}-01-01` };
        } else if (queryString.includes('date:lastYear')) {
          const lastYear = new Date().getFullYear() - 1;
          filters.date = {
            $gte: `${lastYear}-01-01`,
            $lt: `${lastYear + 1}-01-01`,
          };
        } else {
          // Handle date:between, date:gte, date:lte
          const dateBetweenMatch = queryString.match(
            /date:between\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/,
          );
          if (dateBetweenMatch) {
            filters.date = {
              $gte: dateBetweenMatch[1],
              $lte: dateBetweenMatch[2],
            };
          } else {
            const dateGteMatch = queryString.match(
              /date:gte\(\s*"([^"]+)"\s*\)/,
            );
            if (dateGteMatch) {
              filters.date = { $gte: dateGteMatch[1] };
            }

            const dateLteMatch = queryString.match(
              /date:lte\(\s*"([^"]+)"\s*\)/,
            );
            if (dateLteMatch) {
              filters.date = { ...filters.date, $lte: dateLteMatch[1] };
            }
          }
        }

        // Extract amount filters
        const amountGteMatch = queryString.match(/amount:gte\(\s*([^)]+)\s*\)/);
        if (amountGteMatch) {
          const minAmount = parseFloat(amountGteMatch[1]);
          filters.amount = { $gte: minAmount };
        }

        const amountLteMatch = queryString.match(/amount:lte\(\s*([^)]+)\s*\)/);
        if (amountLteMatch) {
          const maxAmount = parseFloat(amountLteMatch[1]);
          filters.amount = { ...filters.amount, $lte: maxAmount };
        }

        console.log('DEBUG: Applied filters:', filters);

        const result = await aqlQuery(
          q('transactions').filter(filters).calculate({ $sum: '$amount' }),
        );

        console.log('DEBUG: Raw query result:', result);
        console.log('DEBUG: Raw sum amount (cents):', result.data);
        console.log('DEBUG: After Math.abs():', Math.abs(result.data || 0));
        console.log(
          'DEBUG: Final value (dollars):',
          Math.abs(result.data || 0) / 100,
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
  console.log('DEBUG: Final asyncMatches:', asyncMatches);
  console.log('DEBUG: Final processedFormula:', processedFormula);

  try {
    // Handle case where the entire formula is just a single query block
    if (
      asyncMatches.length === 1 &&
      processedFormula.trim() === asyncMatches[0].placeholder
    ) {
      console.log(
        'DEBUG: Returning single match value:',
        asyncMatches[0].value,
      );
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
