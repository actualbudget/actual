import { useMemo } from 'react';

import { useAccounts } from '@desktop-client/hooks/useAccounts';

export function useOnBudgetAccounts() {
  const accounts = useAccounts();
  return useMemo(
    () =>
      accounts.filter(
        account => account.closed === 0 && account.offbudget === 0,
      ),
    [accounts],
  );
}
