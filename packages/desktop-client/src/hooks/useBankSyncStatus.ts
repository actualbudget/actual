import { useCallback, useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';

import { useSyncServerStatus } from './useSyncServerStatus';

type ProviderStatus = {
  configured: boolean;
  error?: string;
};

export function useBankSyncStatus(
  providerSlug: string,
  { fileId }: { fileId?: string } = {},
) {
  const [status, setStatus] = useState<ProviderStatus>({
    configured: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const syncServerStatus = useSyncServerStatus();

  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    async function fetchStatus() {
      if (!providerSlug) {
        return;
      }

      setIsLoading(true);

      try {
        if (!fileId) {
          return;
        }

        const result = await send('bank-sync-status', {
          providerSlug,
          fileId,
        });

        if (result && typeof result === 'object') {
          const typedResult = result as {
            configured?: boolean;
            error?: string;
          };
          setStatus({
            configured: typedResult.configured || false,
            error: typedResult.error,
          });
        } else {
          // Fallback when backend is not implemented
          setStatus({
            configured: false,
            error: undefined,
          });
        }
      } catch (error) {
        console.error(`Error fetching status for ${providerSlug}:`, error);
        setStatus({
          configured: false,
          error: (error as Error).message,
        });
      } finally {
        setIsLoading(false);
      }
    }

    if (syncServerStatus === 'online') {
      if (fileId) {
        void fetchStatus();
      }
    }
  }, [providerSlug, fileId, syncServerStatus, refetchTrigger]);

  return {
    configured: status.configured,
    isLoading,
    error: status.error,
    refetch,
  };
}
