import { useEffect, useState } from 'react';

import { send } from 'loot-core/platform/client/fetch';

import { useSyncServerStatus } from './useSyncServerStatus';

type ProviderStatus = {
  configured: boolean;
  error?: string;
};

export function useBankSyncStatus(providerSlug: string) {
  const [status, setStatus] = useState<ProviderStatus>({
    configured: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const syncServerStatus = useSyncServerStatus();

  useEffect(() => {
    async function fetchStatus() {
      if (!providerSlug) {
        return;
      }

      setIsLoading(true);

      try {
        const result = await send('bank-sync-status', {
          providerSlug,
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
      fetchStatus();
    }
  }, [providerSlug, syncServerStatus]);

  return {
    configured: status.configured,
    isLoading,
    error: status.error,
  };
}
