import { useQuery } from '@tanstack/react-query';

import { accountQueries } from '#accounts';

export function useOffBudgetAccounts() {
  return useQuery(accountQueries.listOffBudget());
}
