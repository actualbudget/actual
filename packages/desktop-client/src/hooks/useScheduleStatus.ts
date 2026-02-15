import { useEffect, useEffectEvent } from 'react';

import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { listen } from 'loot-core/platform/client/fetch';
import type { ScheduleEntity } from 'loot-core/types/models';
import type { ServerEvents } from 'loot-core/types/server-events';

import { useSyncedPref } from './useSyncedPref';

import { scheduleQueries } from '@desktop-client/schedules';
import type { ScheduleStatusData } from '@desktop-client/schedules';

type UseScheduleStatusProps = {
  schedules: ScheduleEntity[];
};

type UseScheduleStatusResult = UseQueryResult<ScheduleStatusData>;

export function useScheduleStatus({
  schedules,
}: UseScheduleStatusProps): UseScheduleStatusResult {
  const [upcomingLength = '7'] = useSyncedPref(
    'upcomingScheduledTransactionLength',
  );
  const queryResult = useQuery(
    scheduleQueries.statuses({
      schedules,
      upcomingLength,
    }),
  );

  const onSyncEvent = useEffectEvent((event: ServerEvents['sync-event']) => {
    if (event.type === 'applied') {
      const tables = event.tables;
      if (tables.includes('schedules') || tables.includes('transactions')) {
        queryResult.refetch();
      }
    }
  });

  useEffect(() => listen('sync-event', onSyncEvent), []);

  return queryResult;
}
