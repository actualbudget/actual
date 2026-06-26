import { useQuery } from '@tanstack/react-query';

import { accountQueries } from '#accounts';

export function useAccounts() {
  return useQuery(accountQueries.list());
}
