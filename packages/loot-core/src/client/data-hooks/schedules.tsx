// @ts-strict-ignore
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
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
import { liveQuery } from '../query-helpers';

export type ScheduleStatusType = ReturnType<typeof getStatus>;
export type ScheduleStatuses = Map<ScheduleEntity['id'], ScheduleStatusType>;

function loadStatuses(
  schedules: readonly ScheduleEntity[],
  onData: (data: ScheduleStatuses) => void,
  upcomingLength: string,
) {
  return liveQuery<TransactionEntity>(
    getHasTransactionsQuery(schedules),
    data => {
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
  );
}

type UseSchedulesArgs = { queryBuilder?: (q: Query) => Query };
type ScheduleData = {
  schedules: readonly ScheduleEntity[];
  statuses: ScheduleStatuses;
};
type UseSchedulesResult = ScheduleData & {
  readonly isLoading: boolean;
};

export function useSchedules({
  queryBuilder,
}: UseSchedulesArgs = {}): UseSchedulesResult {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ScheduleData>();
  const [upcomingLength] = useSyncedPref('upcomingScheduledTransactionLength');
  useEffect(() => {
    let isUnmounted = false;

    const query = q('schedules').select('*');
    let statusQuery;

    setIsLoading(true);

    const scheduleQuery = liveQuery<ScheduleEntity>(
      queryBuilder ? queryBuilder(query) : query,
      async schedules => {
        if (scheduleQuery) {
          if (statusQuery) {
            statusQuery.unsubscribe();
          }

          statusQuery = loadStatuses(
            schedules,
            (statuses: ScheduleStatuses) => {
              if (!isUnmounted) {
                setIsLoading(false);
                setData({ schedules, statuses });
              }
            },
            upcomingLength,
          );
        }
      },
    );

    return () => {
      isUnmounted = true;

      if (scheduleQuery) {
        scheduleQuery.unsubscribe();
      }
      if (statusQuery) {
        statusQuery.unsubscribe();
      }
    };
  }, [upcomingLength, queryBuilder]);

  return {
    isLoading,
    ...data,
  };
}

type SchedulesContextValue = UseSchedulesResult;

const SchedulesContext = createContext<SchedulesContextValue>({
  isLoading: true,
  schedules: [],
  statuses: new Map(),
});

type SchedulesProviderProps = PropsWithChildren<{
  queryBuilder?: UseSchedulesArgs['queryBuilder'];
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

export function useDefaultSchedulesQueryBuilder(
  accountId: AccountEntity['id'] | 'budgeted' | 'offbudget' | 'uncategorized',
) {
  return useMemo(() => {
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
  }, [accountId]);
}
