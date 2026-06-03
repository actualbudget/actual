import { useCallback, useEffect, useMemo, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';

import type { BankSyncProvider } from '#hooks/useBankSyncProviders';
import { useSyncServerStatus } from '#hooks/useSyncServerStatus';

type ProviderStatus = {
  configured: boolean;
  error?: string;
};

export type ProviderStatusMap = Record<string, ProviderStatus>;

function parseProviderStatus(result: unknown): ProviderStatus {
  if (!result || typeof result !== 'object') {
    return { configured: false };
  }

  return {
    configured: 'configured' in result ? Boolean(result.configured) : false,
    error:
      'error' in result && typeof result.error === 'string'
        ? result.error
        : undefined,
  };
}

export function useProviderStatusMap({
  providers,
  fileId,
}: {
  providers: BankSyncProvider[];
  fileId?: string;
}) {
  const syncServerStatus = useSyncServerStatus();

  const providerSlugsKey = useMemo(
    () =>
      providers
        .map(p => p.slug)
        .sort()
        .join('|'),
    [providers],
  );

  const [statusMap, setStatusMap] = useState<ProviderStatusMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);

  const refetch = useCallback(() => {
    setRefetchToken(x => x + 1);
  }, []);

  useEffect(() => {
    if (syncServerStatus !== 'online' || !fileId) {
      return;
    }

    const syncFileId = fileId;
    let didCancel = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const entries = await Promise.all(
          providers.map(async provider => {
            const result = await send('bank-sync-status', {
              providerSlug: provider.slug,
              fileId: syncFileId,
            }).catch(err => ({
              configured: false,
              error: err instanceof Error ? err.message : String(err),
            }));

            return [provider.slug, parseProviderStatus(result)] as const;
          }),
        );

        if (!didCancel) {
          const nextStatusMap: ProviderStatusMap = {};
          for (const [providerSlug, status] of entries) {
            nextStatusMap[providerSlug] = status;
          }
          setStatusMap(nextStatusMap);
        }
      } catch (err) {
        if (!didCancel) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!didCancel) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      didCancel = true;
    };
  }, [providerSlugsKey, fileId, providers, syncServerStatus, refetchToken]);

  return { statusMap, isLoading, error, refetch };
}
