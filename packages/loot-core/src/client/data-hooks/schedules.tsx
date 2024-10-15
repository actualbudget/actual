// @ts-strict-ignore
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useMemo,
  type PropsWithChildren,
} from 'react';

import { useSyncedPref } from '@actual-app/web/src/hooks/useSyncedPref';

import { q, type Query } from '../../shared/query';
import { getHasTransactionsQuery, getStatus } from '../../shared/schedules';
import {
  type TransactionEntity,
  type ScheduleEntity,
  type AccountEntity,
} from '../../types/models';
import { accountFilter } from '../queries';
import { type LiveQuery, liveQuery } from '../query-helpers';

const defaultQuery = q('schedules').select('*');

export type ScheduleStatusType = ReturnType<typeof getStatus>;
export type ScheduleStatuses = Map<ScheduleEntity['id'], ScheduleStatusType>;

function loadStatuses(
  schedules: readonly ScheduleEntity[],
  onData: (data: ScheduleStatuses) => void,
  onError: (error: Error) => void,
  upcomingLength: string,
) {
  return liveQuery<TransactionEntity>(getHasTransactionsQuery(schedules), {
    onData: data => {
      const hasTrans = new Set(data.filter(Boolean).map(row => row.schedule));

      const scheduleStatuses = new Map(
        schedules.map(s => [
          s.id,
          getStatus(
            s.next_date,
            s.completed,
            hasTrans.has(s.id),
            upcomingLength,
          ),
        ]),
      ) as ScheduleStatuses;

      onData?.(scheduleStatuses);
    },
    onError,
  });
}

type UseSchedulesProps = {
  queryBuilder?: (q: Query) => Query;
  options?: {
    isDisabled?: boolean;
  };
};
type ScheduleData = {
  schedules: readonly ScheduleEntity[];
  statuses: ScheduleStatuses;
};
type UseSchedulesResult = ScheduleData & {
  readonly isLoading: boolean;
  readonly isDisabled: boolean;
  readonly error?: Error;
};

export function useSchedules({
  queryBuilder,
  options: { isDisabled } = { isDisabled: false },
}: UseSchedulesProps = {}): UseSchedulesResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [data, setData] = useState<ScheduleData>({
    schedules: [],
    statuses: new Map(),
  });
  const [upcomingLength] = useSyncedPref('upcomingScheduledTransactionLength');

  const scheduleQueryRef = useRef<LiveQuery<ScheduleEntity> | null>(null);
  const statusQueryRef = useRef<LiveQuery<TransactionEntity> | null>(null);
  const query = useMemo(
    () => queryBuilder?.(defaultQuery) ?? defaultQuery,
    [queryBuilder],
  );

  useEffect(() => {
    let isUnmounted = false;

    setIsLoading(query !== null);

    scheduleQueryRef.current = liveQuery<ScheduleEntity>(query, {
      onData: async schedules => {
        statusQueryRef.current = loadStatuses(
          schedules,
          (statuses: ScheduleStatuses) => {
            if (!isUnmounted) {
              setIsLoading(false);
              setData({ schedules, statuses });
            }
          },
          setError,
          upcomingLength,
        );
      },
      onError: setError,
    });

    return () => {
      isUnmounted = true;
      scheduleQueryRef.current?.unsubscribe();
      statusQueryRef.current?.unsubscribe();
    };
  }, [query, upcomingLength]);

  return {
    isLoading,
    isDisabled,
    error,
    ...(isDisabled ? { schedules: [], statuses: new Map() } : data),
  };
}

type SchedulesContextValue = UseSchedulesResult;

const SchedulesContext = createContext<SchedulesContextValue>({
  isLoading: false,
  isDisabled: false,
  schedules: [],
  statuses: new Map(),
});

type SchedulesProviderProps = PropsWithChildren<{
  queryBuilder?: UseSchedulesProps['queryBuilder'];
}>;

export function SchedulesProvider({
  queryBuilder,
  children,
}: SchedulesProviderProps) {
  const data = useSchedules({ queryBuilder });
  return (
    <SchedulesContext.Provider value={data}>
      {children}
    </SchedulesContext.Provider>
  );
}

export function useCachedSchedules() {
  return useContext(SchedulesContext);
}

export function defaultSchedulesQueryBuilder(
  accountId?: AccountEntity['id'] | 'budgeted' | 'offbudget' | 'uncategorized',
) {
  const filterByAccount = accountFilter(accountId, '_account');
  const filterByPayee = accountFilter(accountId, '_payee.transfer_acct');

  return (q: Query) => {
    q = q.filter({
      $and: [{ '_account.closed': false }],
    });
    if (accountId) {
      if (accountId === 'uncategorized') {
        q = q.filter({ next_date: null });
      } else {
        q = q.filter({
          $or: [filterByAccount, filterByPayee],
        });
      }
    }
    return q.orderBy({ next_date: 'desc' });
  };
}
