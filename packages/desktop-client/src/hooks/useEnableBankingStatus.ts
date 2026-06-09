import { useCallback, useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import type { BankSyncProviderStatus } from '@actual-app/core/types/models';

import { useSyncServerStatus } from './useSyncServerStatus';

export function useEnableBankingStatus(fileId: string, enabled = true) {
  const [enableBankingStatus, setEnableBankingStatus] =
    useState<BankSyncProviderStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const status = useSyncServerStatus();

  const refreshEnableBankingStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const results = await send('enablebanking-status', { fileId });
      setEnableBankingStatus(results);
    } catch {
      setEnableBankingStatus({ configured: false, source: null });
    } finally {
      setIsLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    if (!enabled) return;

    if (status === 'online') {
      void refreshEnableBankingStatus();
    }
  }, [status, enabled, refreshEnableBankingStatus]);

  return {
    enableBankingStatus,
    refreshEnableBankingStatus,
    isLoading,
  };
}
