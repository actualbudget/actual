import { useQuery } from 'loot-core/client/query-hooks';
import { q } from 'loot-core/shared/query';
import { type ScheduleEntity } from 'loot-core/types/models';

export function useSchedules() {
  return useQuery<ScheduleEntity[]>(() => q('schedules').select('*'), []);
}
