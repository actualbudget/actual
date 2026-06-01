import { useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';

import { useSyncServerStatus } from './useSyncServerStatus';

export function useEnableBankingStatus(fileId: string, enabled = true) {
  const [configuredEnableBanking, setConfiguredEnableBanking] = useState<
    boolean | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const status = useSyncServerStatus();

  useEffect(() => {
    if (!enabled) return;
    const budgetFileId = fileId;

    async function fetch() {
      setIsLoading(true);
      try {
        const results = await send('enablebanking-status', {
          fileId: budgetFileId,
        });
        setConfiguredEnableBanking(results.configured || false);
      } catch {
        setConfiguredEnableBanking(false);
      } finally {
        setIsLoading(false);
      }
    }

    if (status === 'online' && budgetFileId) {
      void fetch();
    }
  }, [status, enabled, fileId]);

  return {
    configuredEnableBanking,
    isLoading,
  };
}
