import { useQuery } from '@tanstack/react-query';

import { accountQueries } from '#accounts';

export function useOnBudgetAccounts() {
  return useQuery(accountQueries.listOnBudget());
}
