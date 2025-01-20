import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

import { useSyncedPref } from '@actual-app/web/src/hooks/useSyncedPref';
import * as d from 'date-fns';
import debounce from 'lodash/debounce';

import { send } from '../../platform/client/fetch';
import { currentDay, addDays, parseDate } from '../../shared/months';
import { type Query } from '../../shared/query';
import {
  getScheduledAmount,
  extractScheduleConds,
  getNextDate,
  getUpcomingDays,
  scheduleIsRecurring,
} from '../../shared/schedules';
import { ungroupTransactions } from '../../shared/transactions';
import {
  type ScheduleEntity,
  type TransactionEntity,
} from '../../types/models';
import * as queries from '../queries';
import { type PagedQuery, pagedQuery } from '../query-helpers';

import { type ScheduleStatuses, useCachedSchedules } from './schedules';

type UseTransactionsProps = {
  /**
   * The Query class is immutable so it is important to memoize the query object
   * to prevent unnecessary re-renders i.e. `useMemo`, `useState`, etc.
   */
  query?: Query;
  options?: {
    pageCount?: number;
  };
};

type UseTransactionsResult = {
  transactions: ReadonlyArray<TransactionEntity>;
  isLoading: boolean;
  error?: Error;
  reload: () => void;
  loadMore: () => void;
  isLoadingMore: boolean;
};

export function useTransactions({
  query,
  options = { pageCount: 50 },
}: UseTransactionsProps): UseTransactionsResult {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [transactions, setTransactions] = useState<
    ReadonlyArray<TransactionEntity>
  >([]);

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
          setIsLoading(false);
        }
      },
      onError,
      options: { pageCount: optionsRef.current.pageCount },
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
    isLoading,
    error,
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

        const dates: string[] = [];
        let day = d.startOfDay(parseDate(schedule.next_date));
        if (isRecurring) {
          while (day <= upcomingPeriodEnd) {
            const nextDate = getNextDate(dateConditions, day);

            if (parseDate(nextDate) > upcomingPeriodEnd) break;

            if (dates.includes(nextDate)) {
              day = parseDate(addDays(day, 1));
              continue;
            }

            dates.push(nextDate);
            day = parseDate(addDays(nextDate, 1));
          }
        } else {
          dates.push(getNextDate(dateConditions, day));
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
            forceUpcoming: schedules.length > 0 || status === 'paid',
          });
        });

        return schedules;
      })
      .flat()
      .sort(
        (a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime(),
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

  return {
    data: previewTransactions,
    isLoading: isLoading || isSchedulesLoading,
    error: error || scheduleQueryError,
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
