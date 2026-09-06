import { send } from '@actual-app/core/platform/client/connection';
import type { AccountGroupEntity } from '@actual-app/core/types/models';
import { queryOptions } from '@tanstack/react-query';

export const accountGroupQueries = {
  all: () => ['account-groups'],
  lists: () => [...accountGroupQueries.all(), 'lists'],
  list: () =>
    queryOptions<AccountGroupEntity[]>({
      queryKey: [...accountGroupQueries.lists()],
      queryFn: () => send('account-groups-get'),
      placeholderData: [],
      staleTime: Infinity,
    }),
};
