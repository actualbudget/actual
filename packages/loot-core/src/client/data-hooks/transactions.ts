import { useEffect, useRef, useState, useCallback } from 'react';

import { send } from '../../platform/client/fetch';
import { q, type Query } from '../../shared/query';
import { ungroupTransactions } from '../../shared/transactions';
import {
  type ScheduleEntity,
  type TransactionEntity,
} from '../../types/models';
import { type PagedQuery, pagedQuery } from '../query-helpers';

import {
  type ScheduleStatuses,
  useDefaultSchedulesQueryBuilder,
  useSchedules,
} from './schedules';

type UseTransactionsProps = {
  queryBuilder: (query: Query) => Query;
  options?: {
    pageCount?: number;
    includePreviewTransactions?: boolean;
    schedulesQueryBuilder?: (query: Query) => Query;
  };
};

type UseTransactionsResult = {
  transactions: ReadonlyArray<TransactionEntity>;
  previewTransactions: ReadonlyArray<TransactionEntity>;
  isLoading?: boolean;
  reload?: () => void;
  loadMore?: () => void;
  updateQuery: (buildQuery: (query: Query) => Query) => void;
};

export function useTransactions({
  queryBuilder,
  options = { pageCount: 50, includePreviewTransactions: false },
}: UseTransactionsProps): UseTransactionsResult {
  const initialQuery = q('transactions').select('*');
  const [query, setQuery] = useState<Query>(
    queryBuilder?.(initialQuery) ?? initialQuery,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<
    ReadonlyArray<TransactionEntity>
  >([]);

  const pagedQueryRef = useRef<PagedQuery<TransactionEntity> | null>(null);

  // We don't want to re-render if options changes.
  // Putting options in a ref will prevent that and
  // allow us to use the latest options on next render.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const defaultSchedulesQueryBuilder = useDefaultSchedulesQueryBuilder();
  const { data: previewTransactions, isLoading: isPreviewTransactionsLoading } =
    usePreviewTransactions({
      queryBuilder:
        optionsRef.current.schedulesQueryBuilder ??
        defaultSchedulesQueryBuilder,
    });

  useEffect(() => {
    let isUnmounted = false;

    setIsLoading(true);

    pagedQueryRef.current = pagedQuery<TransactionEntity>(
      query,
      data => {
        if (!isUnmounted) {
          setIsLoading(false);
          setTransactions(data);
        }
      },
      { pageCount: optionsRef.current.pageCount },
    );

    return () => {
      isUnmounted = true;
      pagedQueryRef.current?.unsubscribe();
    };
  }, [query]);

  const updateQuery = useCallback(
    (queryBuilder: (currentQuery: Query) => Query) =>
      setQuery(queryBuilder?.(query) ?? query),
    [query],
  );

  return {
    transactions: optionsRef.current.includePreviewTransactions
      ? previewTransactions.concat(transactions)
      : transactions,
    previewTransactions,
    isLoading: isLoading || isPreviewTransactionsLoading,
    reload: pagedQueryRef.current?.run,
    loadMore: pagedQueryRef.current?.fetchNext,
    updateQuery,
  };
}

type UsePreviewTransactionsProps = {
  queryBuilder: (query: Query) => Query;
};

type UsePreviewTransactionsResult = {
  data: ReadonlyArray<TransactionEntity>;
  isLoading: boolean;
};

function usePreviewTransactions({
  queryBuilder,
}: UsePreviewTransactionsProps): UsePreviewTransactionsResult {
  const [previewTransactions, setPreviewTransactions] = useState<
    TransactionEntity[]
  >([]);
  const {
    isLoading: isSchedulesLoading,
    schedules,
    statuses,
  } = useSchedules({ queryBuilder });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isSchedulesLoading) {
      return;
    }

    let isUnmounted = false;

    setIsLoading(true);

    // Kick off an async rules application
    const schedulesForPreview =
      schedules?.filter(s => isForPreview(s, statuses)) || [];

    const baseTransactions = schedulesForPreview.map(schedule => ({
      id: 'preview/' + schedule.id,
      payee: schedule._payee,
      account: schedule._account,
      amount: schedule._amount,
      date: schedule.next_date,
      schedule: schedule.id,
    }));

    if (baseTransactions?.length) {
      Promise.all(
        baseTransactions.map(transaction => send('rules-run', { transaction })),
      ).then(newTrans => {
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

          setIsLoading(false);
          setPreviewTransactions(ungroupTransactions(withDefaults));
        }
      });
    } else {
      setIsLoading(false);
    }

    return () => {
      isUnmounted = true;
    };
  }, [isSchedulesLoading, schedules, statuses]);

  return {
    data: previewTransactions,
    isLoading: isLoading || isSchedulesLoading,
  };
}

function isForPreview(schedule: ScheduleEntity, statuses: ScheduleStatuses) {
  const status = statuses.get(schedule.id);
  return (
    !schedule.completed &&
    (status === 'due' || status === 'upcoming' || status === 'missed')
  );
}
