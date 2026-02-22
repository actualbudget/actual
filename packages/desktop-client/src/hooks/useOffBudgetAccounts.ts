import { useQuery } from '@tanstack/react-query';

import { accountQueries } from '@desktop-client/accounts';

export function useOffBudgetAccounts() {
  const query = useQuery(accountQueries.listOffBudget());
  return query.data ?? [];
}
