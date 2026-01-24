import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import type { ScheduleEntity } from 'loot-core/types/models';

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
  return useQuery(
    scheduleQueries.statuses({
      schedules,
      upcomingLength,
    }),
  );
}
