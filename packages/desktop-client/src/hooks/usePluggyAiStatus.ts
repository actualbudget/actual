import { useCallback, useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import type { BankSyncProviderStatus } from '@actual-app/core/types/models';

import { useSyncServerStatus } from './useSyncServerStatus';

export function usePluggyAiStatus(fileId: string) {
  const [pluggyAiStatus, setPluggyAiStatus] =
    useState<BankSyncProviderStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();

  const refreshPluggyAiStatus = useCallback(async () => {
    setIsLoading(true);

    const result = await send('pluggyai-status', { fileId });

    setPluggyAiStatus(result);
    setIsLoading(false);
  }, [fileId]);

  useEffect(() => {
    if (status === 'online') {
      void refreshPluggyAiStatus();
    }
  }, [status, refreshPluggyAiStatus]);

  return {
    pluggyAiStatus,
    refreshPluggyAiStatus,
    isLoading,
  };
}
