import { useEffect, useRef, useState, useCallback } from 'react';

import { send } from '../../platform/client/fetch';
import { q, type Query } from '../../shared/query';
import { ungroupTransactions } from '../../shared/transactions';
import {
  type ScheduleEntity,
  type TransactionEntity,
} from '../../types/models';
import { type PagedQuery, pagedQuery } from '../query-helpers';

import { type ScheduleStatuses, useSchedules } from './schedules';

type UseTransactionsProps = {
  queryBuilder: (query: Query) => Query;
  options?: {
    pageCount?: number;
    loadPreviewTransactions?: boolean;
    filterPreviewTransactions?: (
      transactions: ReadonlyArray<TransactionEntity>,
    ) => ReadonlyArray<TransactionEntity>;
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
  options = { pageCount: 50, loadPreviewTransactions: false },
}: UseTransactionsProps): UseTransactionsResult {
  const initialQuery = q('transactions').select('*');
  const [query, setQuery] = useState<Query>(
    queryBuilder?.(initialQuery) ?? initialQuery,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<
    ReadonlyArray<TransactionEntity>
  >([]);

  const pagedQueryRef = useRef<PagedQuery<TransactionEntity> | null>(null);
  const optionsRef = useRef<UseTransactionsProps['options']>(options);
  optionsRef.current = options;

  const previewTransactions = usePreviewTransactions({
    isDisabled: !optionsRef.current?.loadPreviewTransactions,
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
      { pageCount: optionsRef.current?.pageCount },
    );

    return () => {
      isUnmounted = true;
      pagedQueryRef.current?.unsubscribe();
    };
  }, [query]);

  const filteredPreviewTransactions =
    optionsRef.current?.filterPreviewTransactions?.(previewTransactions) ??
    previewTransactions;

  const updateQuery = useCallback(
    (queryBuilder: (currentQuery: Query) => Query) =>
      setQuery(queryBuilder?.(query) ?? query),
    [query],
  );

  return {
    transactions: filteredPreviewTransactions?.length
      ? filteredPreviewTransactions.concat(transactions)
      : transactions,
    previewTransactions,
    isLoading,
    reload: pagedQueryRef.current?.run,
    loadMore: pagedQueryRef.current?.fetchNext,
    updateQuery,
  };
}

function usePreviewTransactions({
  isDisabled = false,
}: {
  isDisabled?: boolean;
}) {
  const { isLoading: isSchedulesLoading, schedules, statuses } = useSchedules();
  const [previewTransactions, setPreviewTransactions] = useState<
    TransactionEntity[]
  >([]);

  if (isDisabled || isSchedulesLoading) {
    return [];
  }

  // Kick off an async rules application
  const schedulesForPreview =
    schedules.filter(s => isForPreview(s, statuses)) || [];

  const baseTransactions = schedulesForPreview.map(schedule => ({
    id: 'preview/' + schedule.id,
    payee: schedule._payee,
    account: schedule._account,
    amount: schedule._amount,
    date: schedule.next_date,
    schedule: schedule.id,
  }));

  Promise.all(
    baseTransactions.map(transaction => send('rules-run', { transaction })),
  ).then(newTrans => {
    const withDefaults = newTrans.map(t => ({
      ...t,
      category: statuses.get(t.schedule),
      schedule: t.schedule,
      subtransactions: t.subtransactions?.map((st: TransactionEntity) => ({
        ...st,
        id: 'preview/' + st.id,
        schedule: t.schedule,
      })),
    }));
    setPreviewTransactions(ungroupTransactions(withDefaults));
  });

  return previewTransactions;
}

function isForPreview(schedule: ScheduleEntity, statuses: ScheduleStatuses) {
  const status = statuses.get(schedule.id);
  return (
    !schedule.completed &&
    (status === 'due' || status === 'upcoming' || status === 'missed')
  );
}
