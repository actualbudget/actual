import { useMemo } from 'react';

import { useAppSelector } from '../redux';

export function useFailedAccounts() {
  const failedAccounts = useAppSelector(state => state.accounts.failedAccounts);
  return useMemo(
    () => new Map(Object.entries(failedAccounts)),
    [failedAccounts],
  );
}
