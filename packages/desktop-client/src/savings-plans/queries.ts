import { queryOptions } from '@tanstack/react-query';

import { send } from 'loot-core/platform/client/connection';
import type { SavingsPlanEntity } from 'loot-core/types/models';

export const savingsPlanQueries = {
  all: () => ['savings-plans'],
  lists: () => [...savingsPlanQueries.all(), 'lists'],
  list: () =>
    queryOptions<SavingsPlanEntity[]>({
      queryKey: [...savingsPlanQueries.lists()],
      queryFn: async () => {
        const plans: SavingsPlanEntity[] = await send('savings-plans-get');
        return plans;
      },
      placeholderData: [],
      staleTime: Infinity,
    }),
};
