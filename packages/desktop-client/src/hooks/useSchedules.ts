import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import type { Query } from 'loot-core/shared/query';
import type { ScheduleEntity } from 'loot-core/types/models';

import { useSyncedPref } from './useSyncedPref';

import { scheduleQueries } from '@desktop-client/schedules';
import type { ScheduleStatusData } from '@desktop-client/schedules';

export type UseSchedulesProps = {
  query?: Query;
};
export type UseSchedulesResult = UseQueryResult<ScheduleEntity[]>;

export function useSchedules({
  query,
}: UseSchedulesProps = {}): UseSchedulesResult {
  return useQuery(scheduleQueries.aql({ query }));
}

type UseScheduleStatusProps = {
  schedules: ScheduleEntity[];
};

type UseScheduleStatusResult = UseQueryResult<ScheduleStatusData>;

export function useScheduleStatus({
  schedules,
}: UseScheduleStatusProps): UseScheduleStatusResult {
  const [upcomingLength] = useSyncedPref('upcomingScheduledTransactionLength');
  return useQuery(
    scheduleQueries.statuses({
      schedules,
      upcomingLength,
    }),
  );
}
