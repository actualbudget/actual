import { queryOptions } from '@tanstack/react-query';

import { send } from 'loot-core/platform/client/connection';
import type { CustomReportEntity } from 'loot-core/types/models';

export const reportQueries = {
  all: () => ['reports'],
  lists: () => [...reportQueries.all(), 'lists'],
  list: () =>
    queryOptions<CustomReportEntity[]>({
      queryKey: [...reportQueries.lists()],
      queryFn: async () => {
        return await send('report/get');
      },
    }),
};
