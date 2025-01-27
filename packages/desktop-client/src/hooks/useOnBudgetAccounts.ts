import { useMemo } from 'react';

import { useAccounts } from './useAccounts';

export function useOnBudgetAccounts() {
  const accounts = useAccounts();
  return useMemo(
    () => accounts.filter(account => !account.closed && !account.offbudget),
    [accounts],
  );
}
