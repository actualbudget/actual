import { useQuery } from '@tanstack/react-query';

import { accountQueries } from '@desktop-client/accounts';

export function useAccounts() {
  return useQuery(accountQueries.list());
}
