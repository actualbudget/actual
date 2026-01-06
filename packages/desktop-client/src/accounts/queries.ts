import { queryOptions } from '@tanstack/react-query';

import { send } from 'loot-core/platform/client/fetch';
import { type AccountEntity } from 'loot-core/types/models';

export const accountQueries = {
  all: () => ['accounts'],
  lists: () => [...accountQueries.all(), 'lists'],
  list: () =>
    queryOptions<AccountEntity[]>({
      queryKey: [...accountQueries.lists()],
      queryFn: async () => {
        const accounts: AccountEntity[] = await send('accounts-get');
        return accounts;
      },
      placeholderData: [],
      // Manually invalidated when categories change
      staleTime: Infinity,
    }),
  listOnBudget: () =>
    queryOptions<AccountEntity[]>({
      ...accountQueries.list(),
      select: accounts => accounts.filter(account => !account.offbudget),
    }),
  listOffBudget: () =>
    queryOptions<AccountEntity[]>({
      ...accountQueries.list(),
      select: accounts => accounts.filter(account => !!account.offbudget),
    }),
};
