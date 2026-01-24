import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import type { Query } from 'loot-core/shared/query';
import type { ScheduleEntity } from 'loot-core/types/models';

import { scheduleQueries } from '@desktop-client/schedules';

export type UseSchedulesProps = {
  query?: Query;
};
export type UseSchedulesResult = UseQueryResult<ScheduleEntity[]>;

export function useSchedules({
  query,
}: UseSchedulesProps = {}): UseSchedulesResult {
  return useQuery(scheduleQueries.aql({ query }));
}
