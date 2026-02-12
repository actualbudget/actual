import { scheduleQueries } from "@desktop-client/schedules";
import { useQuery } from "@tanstack/react-query";
import { q } from "loot-core/shared/query";
import type { ScheduleEntity } from 'loot-core/types/models';

export function useSchedule(id?: ScheduleEntity['id'] | null) {
  return useQuery({
    ...scheduleQueries.aql({
      // Re-use the results of the get all schedules query
      // since it's most likely already in the cache
      query: q('schedules').select('*'),
    }),
    select: schedules => schedules.find(schedule => schedule.id === id),
    enabled: !!id,
  })
}