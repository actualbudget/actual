import { useQuery } from '@tanstack/react-query';

import { accountQueries } from '@desktop-client/accounts';

export function useAccountsQuery() {
  return useQuery(accountQueries.list());
}
