import { useMemo } from 'react';

import { useAccounts } from './useAccounts';

export function useBudgetedAccounts() {
  const accounts = useAccounts();
  return useMemo(
    () =>
      accounts.filter(
        account => account.closed === 0 && account.offbudget === 0,
      ),
    [accounts],
  );
}
