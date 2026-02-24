import { useQuery } from '@tanstack/react-query';

import { accountQueries } from '@desktop-client/accounts';

export function useOnBudgetAccounts() {
  return useQuery(accountQueries.listOnBudget());
}
