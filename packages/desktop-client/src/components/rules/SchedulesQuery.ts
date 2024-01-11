import { liveQueryContext } from 'loot-core/src/client/query-hooks';
import { q } from 'loot-core/src/shared/query';

export const SchedulesQuery = liveQueryContext(q('schedules').select('*'));
