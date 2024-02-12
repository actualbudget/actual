import { useMemo } from 'react';

import { useAccounts } from './useAccounts';

export function useClosedAccounts() {
  const accounts = useAccounts();
  return useMemo(
    () => accounts.filter(account => account.closed === 1),
    [accounts],
  );
}
