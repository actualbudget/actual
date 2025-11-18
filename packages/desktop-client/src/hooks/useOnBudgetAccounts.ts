import { useQuery } from '@tanstack/react-query';

import { accountQueries } from '@desktop-client/accounts';

export function useOnBudgetAccounts() {
  const query = useQuery(accountQueries.listOnBudget());
  return query.data ?? [];
}
