import { useQuery } from '@tanstack/react-query';

import { accountQueries } from '@desktop-client/accounts';

export function useClosedAccounts() {
  return useQuery(accountQueries.listClosed());
}
