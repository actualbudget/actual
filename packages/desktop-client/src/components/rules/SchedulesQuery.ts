import q from 'loot-core/src/client/query-helpers';
import { liveQueryContext } from 'loot-core/src/client/query-hooks';

export const SchedulesQuery = liveQueryContext(q('schedules').select('*'));
