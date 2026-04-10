import { useQuery } from '@tanstack/react-query';

import { accountQueries } from '#accounts';

export function useClosedAccounts() {
  return useQuery(accountQueries.listClosed());
}
