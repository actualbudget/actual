import { useMemo } from 'react';

import { useAccounts } from './useAccounts';

export function useAccount(id: string) {
  const accounts = useAccounts();
  return useMemo(() => accounts.find(a => a.id === id), [id]);
}
