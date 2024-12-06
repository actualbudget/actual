// @ts-strict-ignore
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
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
  query?: Query;
};
type ScheduleData = {
  schedules: readonly ScheduleEntity[];
  statuses: ScheduleStatuses;
};
type UseSchedulesResult = ScheduleData & {
  readonly isLoading: boolean;
  readonly error?: Error;
};

export function useSchedules({
  query,
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

    if (query.state.table !== 'schedules') {
      onError(new Error('Query must be a schedules query.'));
      return;
    }

    setIsLoading(true);

    scheduleQueryRef.current = liveQuery<ScheduleEntity>(query, {
      onData: async schedules => {
        statusQueryRef.current = loadStatuses(
          schedules,
          (statuses: ScheduleStatuses) => {
            if (!isUnmounted) {
              setData({ schedules, statuses });
              setIsLoading(false);
            }
          },
          onError,
          upcomingLength,
        );
      },
      onError,
    });

    return () => {
      isUnmounted = true;
      scheduleQueryRef.current?.unsubscribe();
      statusQueryRef.current?.unsubscribe();
    };
  }, [query, upcomingLength]);

  return {
    isLoading,
    error,
    ...data,
  };
}

type SchedulesContextValue = UseSchedulesResult;

const SchedulesContext = createContext<SchedulesContextValue | undefined>(
  undefined,
);

type SchedulesProviderProps = PropsWithChildren<{
  query?: UseSchedulesProps['query'];
}>;

export function SchedulesProvider({ query, children }: SchedulesProviderProps) {
  const data = useSchedules({ query });
  return (
    <SchedulesContext.Provider value={data}>
      {children}
    </SchedulesContext.Provider>
  );
}

export function useCachedSchedules() {
  const context = useContext(SchedulesContext);
  if (!context) {
    throw new Error(
      'useCachedSchedules must be used within a SchedulesProvider',
    );
  }
  return context;
}

export function accountSchedulesQuery(
  accountId?: AccountEntity['id'] | 'onbudget' | 'offbudget' | 'uncategorized',
) {
  const filterByAccount = accountFilter(accountId, '_account');
  const filterByPayee = accountFilter(accountId, '_payee.transfer_acct');

  let query = q('schedules')
    .select('*')
    .filter({
      $and: [{ '_account.closed': false }],
    });

  if (accountId) {
    if (accountId === 'uncategorized') {
      query = query.filter({ next_date: null });
    } else {
      query = query.filter({
        $or: [filterByAccount, filterByPayee],
      });
    }
  }

  return query.orderBy({ next_date: 'desc' });
}
