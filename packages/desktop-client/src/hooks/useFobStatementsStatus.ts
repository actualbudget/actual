import { useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import type { BankSyncProviderStatus } from '@actual-app/core/types/models';

import { useSyncServerStatus } from './useSyncServerStatus';

export function useFobStatementsStatus() {
  const [fobStatementsStatus, setFobStatementsStatus] =
    useState<BankSyncProviderStatus>({});
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);

      const results = await send('fobstatements-status');

      setFobStatementsStatus(results);
      setIsLoading(false);
    }

    if (status !== 'online') {
      setFobStatementsStatus({});
      return;
    }

    void fetch();
  }, [status]);

  return {
    fobStatementsStatus,
    setFobStatementsStatus,
    isLoading,
  };
}
