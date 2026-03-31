import { useEffect, useRef, useState } from 'react';

import { q } from 'loot-core/shared/query';
import type { Query } from 'loot-core/shared/query';
import {
  getHasTransactionsQuery,
  getStatus,
  getStatusLabel,
} from 'loot-core/shared/schedules';
import type { ScheduleStatuses } from 'loot-core/shared/schedules';
import type {
  AccountEntity,
  ScheduleEntity,
  TransactionEntity,
} from 'loot-core/types/models';

import { useSyncedPref } from './useSyncedPref';

import { accountFilter } from '@desktop-client/queries';
import { liveQuery } from '@desktop-client/queries/liveQuery';
import type { LiveQuery } from '@desktop-client/queries/liveQuery';

export type ScheduleStatusLabelType = ReturnType<typeof getStatusLabel>;
export type ScheduleStatusLabels = Map<
  ScheduleEntity['id'],
  ScheduleStatusLabelType
>;
function loadStatuses(
  schedules: readonly ScheduleEntity[],
  onData: (data: ScheduleStatuses) => void,
  onError: (error: Error) => void,
  upcomingLength: string = '7',
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
export type UseSchedulesProps = {
  query?: Query;
};
type ScheduleData = {
  schedules: readonly ScheduleEntity[];
  statuses: ScheduleStatuses;
  statusLabels: ScheduleStatusLabels;
};
export type UseSchedulesResult = ScheduleData & {
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
    statusLabels: new Map(),
  });
  const [upcomingLength] = useSyncedPref('upcomingScheduledTransactionLength');

  const scheduleQueryRef = useRef<LiveQuery<ScheduleEntity> | null>(null);
  const statusQueryRef = useRef<LiveQuery<TransactionEntity> | null>(null);

  useEffect(() => {
    let isUnmounted = false;

    setError(undefined);

    if (!query) {
      // This usually means query is not yet set on this render cycle.
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
              setData({
                schedules,
                statuses,
                statusLabels: new Map(
                  [...statuses.keys()].map(key => [
                    key,
                    getStatusLabel(statuses.get(key) || ''),
                  ]),
                ),
              });
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

export function getSchedulesQuery(
  view?: AccountEntity['id'] | 'onbudget' | 'offbudget' | 'uncategorized',
) {
  const filterByAccount = accountFilter(view, '_account');
  const filterByPayee = accountFilter(view, '_payee.transfer_acct');

  let query = q('schedules')
    .select('*')
    .filter({
      $and: [{ '_account.closed': false }],
    });

  if (view) {
    if (view === 'uncategorized') {
      query = query.filter({ next_date: null });
    } else {
      query = query.filter({
        $or: [filterByAccount, filterByPayee],
      });
    }
  }

  return query.orderBy({ next_date: 'desc' });
}
