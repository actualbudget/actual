import { useEffect, useRef, useState } from 'react';

import { send } from '../../platform/client/fetch';
import { type Query } from '../../shared/query';
import { ungroupTransactions } from '../../shared/transactions';
import {
  type ScheduleEntity,
  type TransactionEntity,
} from '../../types/models';
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
  isLoading?: boolean;
  error?: Error;
  reload?: () => void;
  loadMore?: () => void;
};

export function useTransactions({
  query,
  options = { pageCount: 50 },
}: UseTransactionsProps): UseTransactionsResult {
  const [isLoading, setIsLoading] = useState(false);
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

    setIsLoading(query !== null);

    if (!query) {
      return;
    }

    if (query.state.table !== 'transactions') {
      setError(new Error('Query must be a transactions query.'));
      return;
    }

    pagedQueryRef.current = pagedQuery<TransactionEntity>(query, {
      onData: data => {
        if (!isUnmounted) {
          setTransactions(data);
          setIsLoading(false);
        }
      },
      onError: setError,
      options: { pageCount: optionsRef.current.pageCount },
    });

    return () => {
      isUnmounted = true;
      pagedQueryRef.current?.unsubscribe();
    };
  }, [query]);

  return {
    transactions,
    isLoading,
    error,
    reload: pagedQueryRef.current?.run,
    loadMore: pagedQueryRef.current?.fetchNext,
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
  error?: Error;
};

export function usePreviewTransactions({
  options: { isDisabled } = { isDisabled: false },
}: UsePreviewTransactionsProps = {}): UsePreviewTransactionsResult {
  const [previewTransactions, setPreviewTransactions] = useState<
    TransactionEntity[]
  >([]);
  const {
    isLoading: isSchedulesLoading,
    error: scheduleQueryError,
    schedules,
    statuses,
  } = useCachedSchedules();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    if (isSchedulesLoading) {
      return;
    }

    let isUnmounted = false;

    setIsLoading(schedules.length > 0);

    // Kick off an async rules application
    const schedulesForPreview = schedules.filter(s =>
      isForPreview(s, statuses),
    );

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

            setIsLoading(false);
            setPreviewTransactions(ungroupTransactions(withDefaults));
          }
        })
        .catch(error => {
          if (!isUnmounted) {
            setIsLoading(false);
            setError(error);
          }
        });
    }

    return () => {
      isUnmounted = true;
    };
  }, [isSchedulesLoading, schedules, statuses]);

  return {
    data: isDisabled ? [] : previewTransactions,
    isLoading: isLoading || isSchedulesLoading,
    error: error || scheduleQueryError,
  };
}

function isForPreview(schedule: ScheduleEntity, statuses: ScheduleStatuses) {
  const status = statuses.get(schedule.id);
  return (
    !schedule.completed &&
    (status === 'due' || status === 'upcoming' || status === 'missed')
  );
}
