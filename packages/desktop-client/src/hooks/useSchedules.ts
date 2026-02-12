import { useEffect, useEffectEvent } from 'react';

import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { listen } from 'loot-core/platform/client/fetch';
import type { Query } from 'loot-core/shared/query';
import type { ScheduleEntity } from 'loot-core/types/models';
import type { ServerEvents } from 'loot-core/types/server-events';

import { scheduleQueries } from '@desktop-client/schedules';

export type UseSchedulesProps = {
  query?: Query;
};
export type UseSchedulesResult = UseQueryResult<ScheduleEntity[]>;

export function useSchedules({
  query,
}: UseSchedulesProps = {}): UseSchedulesResult {
  const queryResult = useQuery(scheduleQueries.aql({ query }));

  const onSyncEvent = useEffectEvent((event: ServerEvents['sync-event']) => {
    if (event.type === 'applied') {
      const tables = event.tables;
      if (tables.includes('schedules') || tables.includes('rules')) {
        queryResult.refetch();
      }
    }
  });

  useEffect(() => listen('sync-event', onSyncEvent), []);

  return queryResult;
}
