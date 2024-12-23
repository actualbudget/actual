import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

import debounce from 'lodash/debounce';

import { send } from '../../platform/client/fetch';
import { type Query } from '../../shared/query';
import { getScheduledAmount } from '../../shared/schedules';
import { ungroupTransactions } from '../../shared/transactions';
import {
  type TransactionFilterEntity,
  type RuleConditionEntity,
  type ScheduleEntity,
  type TransactionEntity,
} from '../../types/models';
import * as queries from '../queries';
import { type PagedQuery, pagedQuery } from '../query-helpers';

import { type ScheduleStatuses, useCachedSchedules } from './schedules';

type UseTransactionsProps = {
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

  const scheduleTransactions = useMemo(() => {
    if (isSchedulesLoading) {
      return [];
    }

    // Kick off an async rules application
    const schedulesForPreview = schedules.filter(s =>
      isForPreview(s, statuses),
    );

    return schedulesForPreview.map(schedule => ({
      id: 'preview/' + schedule.id,
      payee: schedule._payee,
      account: schedule._account,
      amount: getScheduledAmount(schedule._amount),
      date: schedule.next_date,
      schedule: schedule.id,
    }));
  }, [isSchedulesLoading, schedules, statuses]);

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
            category: statuses.get(t.schedule),
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
  }, [scheduleTransactions, schedules, statuses]);

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

  const updateQueryRef = useRef(updateQuery);
  updateQueryRef.current = updateQuery;

  const resetQueryRef = useRef(resetQuery);
  resetQueryRef.current = resetQuery;

  const updateSearchQuery = useMemo(
    () =>
      debounce((searchText: string) => {
        if (searchText === '') {
          resetQueryRef.current?.();
          setIsSearching(false);
        } else if (searchText) {
          updateQueryRef.current?.(previousQuery =>
            queries.transactionsSearch(previousQuery, searchText, dateFormat),
          );
          setIsSearching(true);
        }
      }, delayMs),
    [dateFormat, delayMs],
  );

  useEffect(() => {
    return () => updateSearchQuery.cancel();
  }, [updateSearchQuery]);

  return {
    isSearching,
    search: updateSearchQuery,
  };
}

type UseTransactionsFilterProps = {
  updateQuery?: (updateFn: (filterQuery: Query) => Query) => void;
  resetQuery?: () => void;
  initialConditions?: RuleConditionEntity[];
  initialConditionsOp?: RuleConditionEntity['conditionsOp'];
};

type UseTransactionsFilterResult = {
  isFiltered: boolean;
  activeFilter?: TransactionFilterEntity;
  dirtyFilter?: TransactionFilterEntity;
  conditionsOp: RuleConditionEntity['conditionsOp'];
  updateConditionsOp: (op: RuleConditionEntity['conditionsOp']) => void;
  conditions: readonly RuleConditionEntity[];
  updateConditions: (
    conditions:
      | RuleConditionEntity[]
      | ((conditions: RuleConditionEntity[]) => RuleConditionEntity[]),
  ) => void;
  clear: () => void;
  reset: () => void;
  applyFilter: (
    savedFilter: TransactionFilterEntity,
    clearConditions?: boolean,
  ) => void;
};

export function useTransactionsFilter({
  updateQuery,
  resetQuery,
  initialConditions = [],
  initialConditionsOp = 'and',
}: UseTransactionsFilterProps): UseTransactionsFilterResult {
  const [isFiltered, setIsFiltered] = useState(false);
  const [activeFilter, setActiveFilter] = useState<
    TransactionFilterEntity | undefined
  >(undefined);
  const [dirtyFilter, setDirtyFilter] = useState<
    TransactionFilterEntity | undefined
  >(undefined);
  const [conditions, setConditions] =
    useState<RuleConditionEntity[]>(initialConditions);
  const [conditionsOp, setConditionsOp] =
    useState<RuleConditionEntity['conditionsOp']>(initialConditionsOp);

  const updateQueryRef = useRef(updateQuery);
  updateQueryRef.current = updateQuery;

  const resetQueryRef = useRef(resetQuery);
  resetQueryRef.current = resetQuery;

  const updateQueryFilter = useCallback(
    async (conditions: RuleConditionEntity[]) => {
      const { filters } = await send('make-filters-from-conditions', {
        conditions,
      });

      const filter = {
        [conditionsOp === 'and' ? '$and' : '$or']: filters,
      };

      updateQueryRef.current?.(previousQuery =>
        previousQuery.unfilter().filter(filter),
      );
    },
    [conditionsOp],
  );

  useEffect(() => {
    if (conditions.length === 0) {
      resetQueryRef.current?.();
      setIsFiltered(false);
    } else {
      updateQueryFilter(conditions).then(() => setIsFiltered(true));
    }
  }, [conditions, updateQueryFilter]);

  const clear = useCallback(() => {
    setConditionsOp(initialConditionsOp);
    setConditions([]);
    setActiveFilter(undefined);
    setDirtyFilter(undefined);
  }, [initialConditionsOp]);

  const reset = useCallback(() => {
    setConditionsOp(initialConditionsOp);
    setConditions(initialConditions);
    setActiveFilter(undefined);
    setDirtyFilter(undefined);
  }, [initialConditions, initialConditionsOp]);

  const applyFilter = useCallback(
    (savedFilter: TransactionFilterEntity, clearConditions = false) => {
      setActiveFilter(savedFilter);
      setDirtyFilter(undefined);
      setConditionsOp(savedFilter.conditionsOp);
      if (clearConditions) {
        setConditions(savedFilter.conditions);
      } else {
        setConditions(previousConditions => [
          ...previousConditions,
          ...savedFilter.conditions,
        ]);
      }
    },
    [],
  );

  const updateConditionsOp = useCallback(
    (op: RuleConditionEntity['conditionsOp'] = 'and') => {
      setConditionsOp(op);
      if (activeFilter && activeFilter.conditionsOp !== op) {
        setDirtyFilter({ ...activeFilter, conditionsOp: op });
      }
    },
    [activeFilter],
  );

  const updateActiveFilterIfNeeded = useCallback(
    ({
      activeFilter,
      conditions,
    }: {
      activeFilter?: TransactionFilterEntity;
      conditions: RuleConditionEntity[];
    }) => {
      if (activeFilter) {
        if (conditions.length === 0) {
          setActiveFilter(undefined);
          setDirtyFilter(undefined);
        } else if (activeFilter.conditions !== conditions) {
          setDirtyFilter({ ...activeFilter, conditions });
        }
      }
    },
    [],
  );

  const updateConditions = useCallback(
    (conditions: Parameters<typeof setConditions>[0]) => {
      setConditions(previousConditions => {
        const maybeNewConditions =
          typeof conditions === 'function'
            ? (conditions(previousConditions) ?? [])
            : (conditions ?? []);

        updateActiveFilterIfNeeded({
          activeFilter,
          conditions: maybeNewConditions,
        });

        return maybeNewConditions;
      });
    },
    [activeFilter, updateActiveFilterIfNeeded],
  );

  return {
    isFiltered,
    activeFilter,
    dirtyFilter,
    applyFilter,
    conditionsOp,
    updateConditionsOp,
    conditions,
    updateConditions,
    clear,
    reset,
  };
}

export type TransactionFilter = RuleConditionEntity | TransactionFilterEntity;

export function isTransactionFilterEntity(
  filter: TransactionFilter,
): filter is TransactionFilterEntity {
  return 'id' in filter;
}

export function toFilterConditions(
  filter: TransactionFilter,
): RuleConditionEntity[] {
  if (isTransactionFilterEntity(filter)) {
    // This is a saved transaction filter.
    return filter.conditions;
  } else {
    // This is a rule condition.
    return [filter];
  }
}

function isForPreview(schedule: ScheduleEntity, statuses: ScheduleStatuses) {
  const status = statuses.get(schedule.id);
  return (
    !schedule.completed &&
    (status === 'due' || status === 'upcoming' || status === 'missed')
  );
}
