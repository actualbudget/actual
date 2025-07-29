import { useEffect, useRef, useState, useCallback } from 'react';

import { type Query } from 'loot-core/shared/query';
import { type IntegerAmount } from 'loot-core/shared/util';
import { type TransactionEntity } from 'loot-core/types/models';

import {
  pagedQuery,
  type PagedQuery,
} from '@desktop-client/queries/pagedQuery';

// Mirrors the `splits` AQL option from the server
type TransactionSplitsOption = 'all' | 'inline' | 'grouped' | 'none';

type CalculateRunningBalancesOption =
  | ((
      transactions: TransactionEntity[],
      splits: TransactionSplitsOption,
      startingBalance?: IntegerAmount,
    ) => Map<TransactionEntity['id'], IntegerAmount>)
  | boolean;

type UseTransactionsProps = {
  /**
   * The Query class is immutable so it is important to memoize the query object
   * to prevent unnecessary re-renders i.e. `useMemo`, `useState`, etc.
   */
  query?: Query;
  /**
   * The options to configure the hook behavior.
   */
  options?: {
    /**
     * The number of transactions to load at a time.
     * This is used for pagination and should be set to a reasonable number
     * to avoid loading too many transactions at once.
     * The default is 50.
     * @default 50
     */
    pageCount?: number;
    /**
     * Whether to calculate running balances for the transactions returned by the query.
     * This can be set to `true` to calculate running balances for all transactions
     * (using the default running balance calculation), or a function that takes the
     * transactions and the query state and returns a map of transaction IDs to running balances.
     * The function will be called with the transactions and the query state
     * whenever the transactions are loaded or reloaded.
     *
     * The default running balance calculation is a simple sum of the transaction amounts
     * in reverse order (bottom up). This works well if the transactions are ordered by
     * date in descending order. If the query orders the transactions differently,
     * a custom `calculateRunningBalances` function should be used instead.
     * @default false
     */
    calculateRunningBalances?: CalculateRunningBalancesOption;
    /**
     * The starting balance to start the running balance calculation from.
     * This is ignored if `calculateRunningBalances` is false.
     * @default 0
     */
    startingBalance?: IntegerAmount;
  };
};

type UseTransactionsResult = {
  /**
   * The transactions returned by the query.
   */
  transactions: ReadonlyArray<TransactionEntity>;
  /**
   * The running balances for the transactions returned by the query.
   * This is only populated if `calculateRunningBalances` is either set to `true`
   * or a function that implements the calculation in the options.
   */
  runningBalances: Map<TransactionEntity['id'], IntegerAmount>;
  /**
   * Whether the transactions are currently being loaded.
   */
  isLoading: boolean;
  /**
   * An error that occurred while loading the transactions.
   */
  error?: Error;
  /**
   * Reload the transactions.
   */
  reload: () => void;
  /**
   * Load more transactions.
   */
  loadMore: () => void;
  /**
   * Whether more transactions are currently being loaded.
   */
  isLoadingMore: boolean;
};

export function useTransactions({
  query,
  options = { pageCount: 50, calculateRunningBalances: false },
}: UseTransactionsProps): UseTransactionsResult {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [transactions, setTransactions] = useState<
    ReadonlyArray<TransactionEntity>
  >([]);
  const [runningBalances, setRunningBalances] = useState<
    Map<TransactionEntity['id'], IntegerAmount>
  >(new Map());

  const pagedQueryRef = useRef<PagedQuery<TransactionEntity> | null>(null);

  // We don't want to re-render if options changes.
  // Putting options in a ref will prevent that and
  // allow us to use the latest options on next render.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let isUnmounted = false;

    setError(undefined);

    if (!query) {
      return;
    }

    function onError(error: Error) {
      if (!isUnmounted) {
        setError(error);
        setIsLoading(false);
      }
    }

    if (query.state.table !== 'transactions') {
      onError(new Error('Query must be a transactions query.'));
      return;
    }

    setIsLoading(true);

    pagedQueryRef.current = pagedQuery<TransactionEntity>(query, {
      onData: data => {
        if (!isUnmounted) {
          setTransactions(data);

          const calculateFn = getCalculateRunningBalancesFn(
            optionsRef.current?.calculateRunningBalances,
          );
          if (calculateFn) {
            setRunningBalances(
              calculateFn(
                data,
                query.state.tableOptions?.splits as TransactionSplitsOption,
                optionsRef.current?.startingBalance,
              ),
            );
          }

          setIsLoading(false);
        }
      },
      onError,
      options: optionsRef.current.pageCount
        ? { pageCount: optionsRef.current.pageCount }
        : {},
    });

    return () => {
      isUnmounted = true;
      pagedQueryRef.current?.unsubscribe();
    };
  }, [query]);

  const loadMore = useCallback(async () => {
    if (!pagedQueryRef.current) {
      return;
    }

    setIsLoadingMore(true);

    await pagedQueryRef.current
      .fetchNext()
      .catch(setError)
      .finally(() => {
        setIsLoadingMore(false);
      });
  }, []);

  const reload = useCallback(() => {
    pagedQueryRef.current?.run();
  }, []);

  return {
    transactions,
    runningBalances,
    isLoading,
    ...(error && { error }),
    reload,
    loadMore,
    isLoadingMore,
  };
}

function getCalculateRunningBalancesFn(
  calculateRunningBalances: CalculateRunningBalancesOption = false,
) {
  return calculateRunningBalances === true
    ? calculateRunningBalancesBottomUp
    : typeof calculateRunningBalances === 'function'
      ? calculateRunningBalances
      : undefined;
}

export function calculateRunningBalancesBottomUp(
  transactions: TransactionEntity[],
  splits: TransactionSplitsOption,
  startingBalance: IntegerAmount = 0,
) {
  return (
    transactions
      .filter(t => {
        switch (splits) {
          case 'all':
            // Only calculate parent/non-split amounts
            return !t.parent_id;
          default:
            // inline
            // grouped
            // none
            return true;
        }
      })
      // We're using `reduceRight` here to calculate the running balance in reverse order (bottom up).
      .reduceRight((acc, transaction, index, arr) => {
        const previousTransactionIndex = index + 1;
        if (previousTransactionIndex >= arr.length) {
          // This is the last transaction in the list,
          // so we set the running balance to the starting balance + the amount of the transaction
          acc.set(transaction.id, startingBalance + transaction.amount);
          return acc;
        }
        const previousTransaction = arr[previousTransactionIndex];
        const previousRunningBalance = acc.get(previousTransaction.id) ?? 0;
        const currentRunningBalance =
          previousRunningBalance + transaction.amount;
        acc.set(transaction.id, currentRunningBalance);
        return acc;
      }, new Map<TransactionEntity['id'], IntegerAmount>())
  );
}

export function calculateRunningBalancesTopDown(
  transactions: TransactionEntity[],
  splits: TransactionSplitsOption,
  startingBalance: IntegerAmount = 0,
) {
  return transactions
    .filter(t => {
      switch (splits) {
        case 'all':
          // Only calculate parent/non-split amounts
          return !t.parent_id;
        default:
          // inline
          // grouped
          // none
          return true;
      }
    })
    .reduce((acc, transaction, index, arr) => {
      if (index === 0) {
        // This is the first transaction in the list,
        // so we set the running balance to the starting balance
        acc.set(transaction.id, startingBalance);
        return acc;
      }

      if (index === arr.length - 1) {
        // This is the last transaction in the list,
        // so we set the running balance to the amount of the transaction
        acc.set(transaction.id, transaction.amount);
        return acc;
      }

      const previousTransaction = arr[index - 1];
      const previousRunningBalance = acc.get(previousTransaction.id) ?? 0;
      const previousAmount = previousTransaction.amount ?? 0;
      const currentRunningBalance = previousRunningBalance - previousAmount;
      acc.set(transaction.id, currentRunningBalance);
      return acc;
    }, new Map<TransactionEntity['id'], IntegerAmount>());
}
