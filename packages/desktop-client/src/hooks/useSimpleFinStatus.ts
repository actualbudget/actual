import { useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import type { BankSyncProviderStatus } from '@actual-app/core/types/models';

import { useSyncServerStatus } from './useSyncServerStatus';

export function useSimpleFinStatus() {
  const [simpleFinStatus, setSimpleFinStatus] =
    useState<BankSyncProviderStatus>({});
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);

      const results = await send('simplefin-status');

      setSimpleFinStatus(results);
      setIsLoading(false);
    }

    if (status !== 'online') {
      setSimpleFinStatus({});
      return;
    }

    void fetch();
  }, [status]);

  return {
    simpleFinStatus,
    setSimpleFinStatus,
    isLoading,
  };
}
