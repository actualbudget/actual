import { useEffect, useMemo, useRef, useState } from 'react';

import { q } from '@actual-app/core/shared/query';
import type { Query } from '@actual-app/core/shared/query';
import {
  getHasTransactionsQuery,
  getStatus,
} from '@actual-app/core/shared/schedules';
import type { ScheduleStatuses } from '@actual-app/core/shared/schedules';
import { isPreviewId } from '@actual-app/core/shared/transactions';
import type {
  AccountEntity,
  ScheduleEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import { accountFilter } from '#queries';
import { liveQuery } from '#queries/liveQuery';
import type { LiveQuery } from '#queries/liveQuery';
import { getStatusLabel } from '#util/schedule';

import { useSyncedPref } from './useSyncedPref';

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
            s.custom_upcoming_length ?? upcomingLength,
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
      // No query yet (or the caller disabled the subscription) — clear any
      // data left over from a previous query
      setData({
        schedules: [],
        statuses: new Map(),
        statusLabels: new Map(),
      });
      setIsLoading(false);
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
        // `onData` fires again whenever the schedules change, so tear down the
        // previous status query first. Otherwise each refresh orphans a live
        // query that stays subscribed to sync events and keeps re-running.
        statusQueryRef.current?.unsubscribe();
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

/**
 * Schedules behind the preview (scheduled) transactions among the given
 * selected ids. Only subscribes to the schedules query when preview
 * transactions are actually selected — this is used for every transaction
 * row's context menu, and an unconditional subscription per row floods the
 * backend on every table change.
 */
export function useSelectedPreviewSchedules(
  selectedIds: string[],
): UseSchedulesResult {
  const scheduleIds = useMemo(
    () => selectedIds.filter(id => isPreviewId(id)).map(id => id.split('/')[1]),
    [selectedIds],
  );

  const scheduleQuery = useMemo(
    () =>
      scheduleIds.length > 0
        ? q('schedules')
            .filter({ id: { $oneof: scheduleIds } })
            .select('*')
        : undefined,
    [scheduleIds],
  );

  return useSchedules({ query: scheduleQuery });
}
