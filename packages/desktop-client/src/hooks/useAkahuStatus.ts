import { useCallback, useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import type { BankSyncProviderStatus } from '@actual-app/core/types/models';

import { useSyncServerStatus } from './useSyncServerStatus';

export function useAkahuStatus(fileId: string, enabled = true) {
  const [akahuStatus, setAkahuStatus] = useState<BankSyncProviderStatus | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();

  const refreshAkahuStatus = useCallback(async () => {
    setIsLoading(true);

    const results = await send('akahu-status', { fileId });

    setAkahuStatus(results);
    setIsLoading(false);
  }, [fileId]);

  useEffect(() => {
    if (!enabled) return;

    if (status === 'online') {
      void refreshAkahuStatus();
    }
  }, [status, enabled, refreshAkahuStatus]);

  return {
    akahuStatus,
    refreshAkahuStatus,
    isLoading,
  };
}
