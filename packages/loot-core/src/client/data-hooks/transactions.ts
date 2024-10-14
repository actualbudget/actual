import { useEffect, useRef, useState, useCallback } from 'react';

import { send } from '../../platform/client/fetch';
import { q, type Query } from '../../shared/query';
import { ungroupTransactions } from '../../shared/transactions';
import {
  type ScheduleEntity,
  type TransactionEntity,
} from '../../types/models';
import { type PagedQuery, pagedQuery } from '../query-helpers';

import { type ScheduleStatuses, useCachedSchedules } from './schedules';

const defaultQuery = q('transactions').select('*');

type UseTransactionsProps = {
  queryBuilder: (query: Query) => Query;
  options?: {
    pageCount?: number;
  };
};

type UseTransactionsResult = {
  transactions: ReadonlyArray<TransactionEntity>;
  isLoading?: boolean;
  reload?: () => void;
  loadMore?: () => void;
  updateQuery: (buildQuery: (query: Query) => Query) => void;
};

export function useTransactions({
  queryBuilder,
  options = { pageCount: 50 },
}: UseTransactionsProps): UseTransactionsResult {
  const [query, setQuery] = useState<Query>(
    queryBuilder?.(defaultQuery) ?? defaultQuery,
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
      setQuery(currentQuery => queryBuilder?.(currentQuery) ?? currentQuery),
    [],
  );

  return {
    transactions,
    isLoading,
    reload: pagedQueryRef.current?.run,
    loadMore: pagedQueryRef.current?.fetchNext,
    updateQuery,
  };
}

type UsePreviewTransactionsProps = {
  options?: {
    isDisabled?: boolean;
  };
};

type UsePreviewTransactionsResult = {
  data: ReadonlyArray<TransactionEntity>;
  isLoading: boolean;
};

export function usePreviewTransactions2({
  options: { isDisabled } = { isDisabled: false },
}: UsePreviewTransactionsProps = {}): UsePreviewTransactionsResult {
  const [previewTransactions, setPreviewTransactions] = useState<
    TransactionEntity[]
  >([]);
  const {
    isLoading: isSchedulesLoading,
    schedules,
    statuses,
  } = useCachedSchedules();
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
    } else if (!isUnmounted) {
      // Nothing to preview
      setIsLoading(false);
    }

    return () => {
      isUnmounted = true;
    };
  }, [isSchedulesLoading, schedules, statuses]);

  return {
    data: isDisabled ? [] : previewTransactions,
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
