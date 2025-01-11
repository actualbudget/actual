import { useMemo } from 'react';

import { useSelector } from '../redux';

export function useFailedAccounts() {
  const failedAccounts = useSelector(state => state.accounts.failedAccounts);
  return useMemo(
    () => new Map(Object.entries(failedAccounts)),
    [failedAccounts],
  );
}
