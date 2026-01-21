import { useEffect, useRef, useState } from 'react';

import { listen, send } from 'loot-core/platform/client/fetch';
import { q, type Query } from 'loot-core/shared/query';
import {
  getHasTransactionsQuery,
  getStatus,
  getStatusLabel,
} from 'loot-core/shared/schedules';
import type {
  AccountEntity,
  ScheduleEntity,
  TransactionEntity,
} from 'loot-core/types/models';

import { useSyncedPref } from './useSyncedPref';

import { accountFilter } from '@desktop-client/queries';
import { liveQuery, type LiveQuery } from '@desktop-client/queries/liveQuery';

export type ScheduleStatusType = ReturnType<typeof getStatus>;
export type ScheduleStatuses = Map<ScheduleEntity['id'], ScheduleStatusType>;

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

// Fields needed by schedule consumers (preview transactions, schedule lists, etc.)
const SCHEDULE_FIELDS = [
  // Stored fields
  'id',
  'name',
  'next_date',
  'completed',
  'rule',
  // Computed fields (from associated rule)
  '_conditions',
  '_payee',
  '_account',
  '_amount',
  '_amountOp',
  '_date',
];

export function getSchedulesQuery(
  view?: AccountEntity['id'] | 'onbudget' | 'offbudget' | 'uncategorized',
  options?: { includeClosedAccounts?: boolean },
) {
  const filterByAccount = accountFilter(view, '_account');
  const filterByPayee = accountFilter(view, '_payee.transfer_acct');

  // Start with base query - optionally skip the _account.closed filter
  // which requires an expensive accounts table lookup
  let query = q('schedules').select(SCHEDULE_FIELDS);

  // Only add the closed account filter if not explicitly skipped
  // (consumer can filter client-side using accounts data they already have)
  if (!options?.includeClosedAccounts) {
    query = query.filter({
      $and: [{ '_account.closed': false }],
    });
  }

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
 * Optimized hook for loading schedules for preview transactions.
 * Uses a direct API call instead of the AQL liveQuery for better performance.
 */
export function useSchedulesOptimized({
  accountId,
}: {
  accountId?: string;
}): UseSchedulesResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [data, setData] = useState<ScheduleData>({
    schedules: [],
    statuses: new Map(),
    statusLabels: new Map(),
  });
  const [upcomingLength] = useSyncedPref('upcomingScheduledTransactionLength');

  useEffect(() => {
    let isUnmounted = false;

    async function loadSchedules() {
      setIsLoading(true);
      setError(undefined);

      try {
        // Use the combined endpoint that returns schedules + statuses in one call
        const result = (await send('schedule/get-with-statuses', {
          accountId,
          upcomingLength: String(upcomingLength),
        })) as {
          schedules: ScheduleEntity[];
          statuses: Record<string, string>;
        };

        if (isUnmounted) return;

        const { schedules, statuses: statusObj } = result;

        // Convert statuses object to Map
        const statuses = new Map(Object.entries(statusObj)) as ScheduleStatuses;

        const statusLabels = new Map(
          [...statuses.keys()].map(key => [
            key,
            getStatusLabel(statuses.get(key) || ''),
          ]),
        ) as ScheduleStatusLabels;

        setData({ schedules, statuses, statusLabels });
        setIsLoading(false);
      } catch (err) {
        if (!isUnmounted) {
          setError(err as Error);
          setIsLoading(false);
        }
      }
    }

    loadSchedules();

    // Listen for changes to refresh
    const unsubscribe = listen('sync-event', event => {
      if (
        (event.type === 'applied' || event.type === 'success') &&
        event.tables.some((t: string) =>
          ['schedules', 'rules', 'transactions'].includes(t),
        )
      ) {
        loadSchedules();
      }
    });

    return () => {
      isUnmounted = true;
      unsubscribe();
    };
  }, [accountId, upcomingLength]);

  return { isLoading, error, ...data };
}
