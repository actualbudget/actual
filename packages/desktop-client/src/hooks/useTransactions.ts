import { useEffect, useEffectEvent, useMemo } from 'react';

import { listen } from '@actual-app/core/platform/client/connection';
import type { Query } from '@actual-app/core/shared/query';
import type { IntegerAmount } from '@actual-app/core/shared/util';
import type { TransactionEntity } from '@actual-app/core/types/models';
import type { ServerEvents } from '@actual-app/core/types/server-events';
import { useInfiniteQuery } from '@tanstack/react-query';
import type {
  InfiniteData,
  UseInfiniteQueryResult,
} from '@tanstack/react-query';

import { transactionQueries } from '#transactions';

// Mirrors the `splits` AQL option from the server
type TransactionSplitsOption = 'all' | 'inline' | 'grouped' | 'none';

type CalculateRunningBalancesOption =
  | ((
      transactions: readonly TransactionEntity[],
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
    pageSize?: number;
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

    /**
     * Whether to refetch transactions when a sync event is emitted.
     * @default true
     */
    refetchOnSync?: boolean;
  };
};

type UseTransactionsResult = UseInfiniteQueryResult<
  InfiniteData<TransactionEntity[]>,
  Error
> & {
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
};

export function useTransactions({
  query,
  options,
}: UseTransactionsProps): UseTransactionsResult {
  const {
    pageSize = 50,
    calculateRunningBalances = false,
    startingBalance,
    refetchOnSync = true,
  } = options ?? {};

  const queryResult = useInfiniteQuery(
    transactionQueries.aql({ query, pageSize }),
  );

  const onSyncEvent = useEffectEvent((event: ServerEvents['sync-event']) => {
    if (event.type === 'applied') {
      const tables = event.tables;
      if (
        tables.includes('transactions') ||
        tables.includes('category_mapping') ||
        tables.includes('payee_mapping')
      ) {
        void queryResult.refetch();
      }
    }
  });

  useEffect(() => {
    if (!refetchOnSync) {
      return;
    }
    return listen('sync-event', onSyncEvent);
  }, [refetchOnSync]);

  const calculateRunningBalancesOptionFn = getCalculateRunningBalancesFn(
    calculateRunningBalances,
  );
  const splitsOption = query?.state.tableOptions
    ?.splits as TransactionSplitsOption;

  // Flatten the paginated pages a single time per data change. This value is
  // also reused for the running balance calculation below.
  const transactions = useMemo(
    () => flattenPages(queryResult.data),
    [queryResult.data],
  );

  // Derive running balances from the flattened transactions. We memoize here
  // (rather than computing in an effect + setState) to avoid an extra render
  // pass on every data change and to keep a stable Map identity for consumers
  // that pass `runningBalances` into dependency arrays (e.g. virtualized
  // lists). The O(n) recalculation only runs when its inputs actually change.
  const runningBalances = useMemo(() => {
    if (!calculateRunningBalancesOptionFn || !queryResult.isSuccess) {
      return EMPTY_RUNNING_BALANCES;
    }
    return calculateRunningBalancesOptionFn(
      transactions,
      splitsOption,
      startingBalance,
    );
  }, [
    transactions,
    queryResult.isSuccess,
    calculateRunningBalancesOptionFn,
    startingBalance,
    splitsOption,
  ]);

  return {
    ...queryResult,
    transactions,
    runningBalances,
  };
}

// Shared empty result so the "no running balances" case keeps a stable
// reference across renders for consumers using it in dependency arrays.
const EMPTY_RUNNING_BALANCES: Map<TransactionEntity['id'], IntegerAmount> =
  new Map();

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
  transactions: readonly TransactionEntity[],
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
  transactions: readonly TransactionEntity[],
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

function flattenPages(
  data?: InfiniteData<TransactionEntity[]>,
): TransactionEntity[] {
  return data ? data.pages.flat() : [];
}
