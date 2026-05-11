import { send } from '@actual-app/core/platform/client/connection';
import type { SavingsPlanEntity } from '@actual-app/core/types/models';
import { queryOptions } from '@tanstack/react-query';

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
