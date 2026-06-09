import { useCallback, useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import type { BankSyncProviderStatus } from '@actual-app/core/types/models';

import { useSyncServerStatus } from './useSyncServerStatus';

export function useGoCardlessStatus(fileId: string) {
  const [goCardlessStatus, setGoCardlessStatus] =
    useState<BankSyncProviderStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();

  const refreshGoCardlessStatus = useCallback(async () => {
    setIsLoading(true);

    const results = await send('gocardless-status', { fileId });

    setGoCardlessStatus(results);
    setIsLoading(false);
  }, [fileId]);

  useEffect(() => {
    if (status === 'online') {
      void refreshGoCardlessStatus();
    }
  }, [status, refreshGoCardlessStatus]);

  return {
    goCardlessStatus,
    refreshGoCardlessStatus,
    isLoading,
  };
}
