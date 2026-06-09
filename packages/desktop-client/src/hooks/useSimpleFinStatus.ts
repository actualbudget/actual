import { useCallback, useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import type { BankSyncProviderStatus } from '@actual-app/core/types/models';

import { useSyncServerStatus } from './useSyncServerStatus';

export function useSimpleFinStatus(fileId: string) {
  const [simpleFinStatus, setSimpleFinStatus] =
    useState<BankSyncProviderStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();

  const refreshSimpleFinStatus = useCallback(async () => {
    setIsLoading(true);

    const results = await send('simplefin-status', { fileId });

    setSimpleFinStatus(results);
    setIsLoading(false);
  }, [fileId]);

  useEffect(() => {
    if (status === 'online') {
      void refreshSimpleFinStatus();
    }
  }, [status, refreshSimpleFinStatus]);

  return {
    simpleFinStatus,
    refreshSimpleFinStatus,
    isLoading,
  };
}
