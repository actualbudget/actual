import { useQuery } from '@tanstack/react-query';

import { accountQueries } from '@desktop-client/accounts';

export function useOffBudgetAccounts() {
  return useQuery(accountQueries.listOffBudget());
}
