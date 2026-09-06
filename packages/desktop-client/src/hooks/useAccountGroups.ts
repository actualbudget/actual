import { useQuery } from '@tanstack/react-query';

import { accountGroupQueries } from '#account-groups';

export function useAccountGroups() {
  return useQuery(accountGroupQueries.list());
}
