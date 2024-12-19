import { useMemo } from 'react';

import { useSelector } from '../redux';

export function useFailedAccounts() {
  const failedAccounts = useSelector(state => state.account.failedAccounts);
  return useMemo(
    () => new Map(Object.entries(failedAccounts)),
    [failedAccounts],
  );
}
