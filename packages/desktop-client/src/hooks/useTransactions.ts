import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

import * as d from 'date-fns';
import debounce from 'lodash/debounce';

import { send } from 'loot-core/platform/client/fetch';
import { currentDay, addDays, parseDate } from 'loot-core/shared/months';
import { type QueryState, type Query } from 'loot-core/shared/query';
import {
  getScheduledAmount,
  extractScheduleConds,
  getNextDate,
  getUpcomingDays,
  scheduleIsRecurring,
} from 'loot-core/shared/schedules';
import { ungroupTransactions } from 'loot-core/shared/transactions';
import { type IntegerAmount } from 'loot-core/shared/util';
import {
  type ScheduleEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { useCachedSchedules } from './useCachedSchedules';
import type { ScheduleStatuses } from './useSchedules';

import { useSyncedPref } from '@actual-app/web/src/hooks/useSyncedPref';
import {
  type PagedQuery,
  pagedQuery,
} from '@desktop-client/queries/pagedQuery';
import * as queries from '@desktop-client/queries/queries';

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
    calculateRunningBalances?:
      | ((
          transactions: TransactionEntity[],
          queryState: QueryState,
        ) => Map<TransactionEntity['id'], IntegerAmount>)
      | boolean;
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

          const calculateFn = getCalculateRunningBalancesFn(optionsRef.current);
          if (calculateFn) {
            setRunningBalances(calculateFn(data, query.state));
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

type UsePreviewTransactionsResult = {
  data: ReadonlyArray<TransactionEntity>;
  isLoading: boolean;
  error?: Error;
};

export function usePreviewTransactions(): UsePreviewTransactionsResult {
  const [previewTransactions, setPreviewTransactions] = useState<
    TransactionEntity[]
  >([]);
  const {
    isLoading: isSchedulesLoading,
    error: scheduleQueryError,
    schedules,
    statuses,
  } = useCachedSchedules();
  const [isLoading, setIsLoading] = useState(isSchedulesLoading);
  const [error, setError] = useState<Error | undefined>(undefined);

  const [upcomingLength] = useSyncedPref('upcomingScheduledTransactionLength');

  const scheduleTransactions = useMemo(() => {
    if (isSchedulesLoading) {
      return [];
    }

    // Kick off an async rules application
    const schedulesForPreview = schedules.filter(s =>
      isForPreview(s, statuses),
    );

    const today = d.startOfDay(parseDate(currentDay()));

    const upcomingPeriodEnd = d.startOfDay(
      parseDate(addDays(today, getUpcomingDays(upcomingLength))),
    );

    return schedulesForPreview
      .map(schedule => {
        const { date: dateConditions } = extractScheduleConds(
          schedule._conditions,
        );

        const status = statuses.get(schedule.id);
        const isRecurring = scheduleIsRecurring(dateConditions);

        const dates: string[] = [schedule.next_date];
        let day = d.startOfDay(parseDate(schedule.next_date));
        if (isRecurring) {
          while (day <= upcomingPeriodEnd) {
            const nextDate = getNextDate(dateConditions, day);

            if (d.startOfDay(parseDate(nextDate)) > upcomingPeriodEnd) break;

            if (dates.includes(nextDate)) {
              day = d.startOfDay(parseDate(addDays(day, 1)));
              continue;
            }

            dates.push(nextDate);
            day = d.startOfDay(parseDate(addDays(nextDate, 1)));
          }
        }

        if (status === 'paid') {
          dates.shift();
        }

        const schedules: {
          id: string;
          payee: string;
          account: string;
          amount: number;
          date: string;
          schedule: string;
          forceUpcoming: boolean;
        }[] = [];
        dates.forEach(date => {
          schedules.push({
            id: 'preview/' + schedule.id + `/${date}`,
            payee: schedule._payee,
            account: schedule._account,
            amount: getScheduledAmount(schedule._amount),
            date,
            schedule: schedule.id,
            forceUpcoming: date !== schedule.next_date || status === 'paid',
          });
        });

        return schedules;
      })
      .flat()
      .sort(
        (a, b) =>
          parseDate(b.date).getTime() - parseDate(a.date).getTime() ||
          a.amount - b.amount,
      );
  }, [isSchedulesLoading, schedules, statuses, upcomingLength]);

  useEffect(() => {
    let isUnmounted = false;

    setError(undefined);

    if (scheduleTransactions.length === 0) {
      setPreviewTransactions([]);
      return;
    }

    setIsLoading(true);

    Promise.all(
      scheduleTransactions.map(transaction =>
        send('rules-run', { transaction }),
      ),
    )
      .then(newTrans => {
        if (!isUnmounted) {
          const withDefaults = newTrans.map(t => ({
            ...t,
            category: t.schedule != null ? statuses.get(t.schedule) : undefined,
            schedule: t.schedule,
            subtransactions: t.subtransactions?.map(
              (st: TransactionEntity) => ({
                ...st,
                id: 'preview/' + st.id,
                schedule: t.schedule,
              }),
            ),
          }));

          setPreviewTransactions(ungroupTransactions(withDefaults));
          setIsLoading(false);
        }
      })
      .catch(error => {
        if (!isUnmounted) {
          setError(error);
          setIsLoading(false);
        }
      });

    return () => {
      isUnmounted = true;
    };
  }, [scheduleTransactions, schedules, statuses, upcomingLength]);

  const returnError = error || scheduleQueryError;
  return {
    data: previewTransactions,
    isLoading: isLoading || isSchedulesLoading,
    ...(returnError && { error: returnError }),
  };
}

type UseTransactionsSearchProps = {
  updateQuery: (updateFn: (searchQuery: Query) => Query) => void;
  resetQuery: () => void;
  dateFormat: string;
  delayMs?: number;
};

type UseTransactionsSearchResult = {
  isSearching: boolean;
  search: (searchText: string) => void;
};

export function useTransactionsSearch({
  updateQuery,
  resetQuery,
  dateFormat,
  delayMs = 150,
}: UseTransactionsSearchProps): UseTransactionsSearchResult {
  const [isSearching, setIsSearching] = useState(false);

  const updateSearchQuery = useMemo(
    () =>
      debounce((searchText: string) => {
        if (searchText === '') {
          resetQuery();
          setIsSearching(false);
        } else if (searchText) {
          resetQuery();
          updateQuery(previousQuery =>
            queries.transactionsSearch(previousQuery, searchText, dateFormat),
          );
          setIsSearching(true);
        }
      }, delayMs),
    [dateFormat, delayMs, resetQuery, updateQuery],
  );

  useEffect(() => {
    return () => updateSearchQuery.cancel();
  }, [updateSearchQuery]);

  return {
    isSearching,
    search: updateSearchQuery,
  };
}

function isForPreview(schedule: ScheduleEntity, statuses: ScheduleStatuses) {
  const status = statuses.get(schedule.id);
  return (
    !schedule.completed &&
    ['due', 'upcoming', 'missed', 'paid'].includes(status!)
  );
}

function getCalculateRunningBalancesFn(
  options: UseTransactionsProps['options'],
) {
  const calculateRunningBalances = options?.calculateRunningBalances ?? false;
  return calculateRunningBalances === true
    ? calculateRunningBalancesBottomUp
    : typeof calculateRunningBalances === 'function'
      ? calculateRunningBalances
      : undefined;
}

function calculateRunningBalancesBottomUp(
  transactions: TransactionEntity[],
  queryState: QueryState,
) {
  return (
    transactions
      .filter(t => {
        const splits = queryState.tableOptions?.splits;
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
          // so we set the running balance to the amount of the transaction
          acc.set(transaction.id, transaction.amount);
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
