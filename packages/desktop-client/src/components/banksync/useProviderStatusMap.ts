import { useCallback, useEffect, useMemo, useState } from 'react';

import { send } from 'loot-core/platform/client/fetch';

import { useSyncServerStatus } from '@desktop-client/hooks/useSyncServerStatus';

export type InternalBankSyncProvider = {
  slug: string;
  displayName: string;
};

const INTERNAL_PROVIDERS: InternalBankSyncProvider[] = [
  { slug: 'goCardless', displayName: 'GoCardless' },
  { slug: 'simpleFin', displayName: 'SimpleFIN' },
  { slug: 'pluggyai', displayName: 'Pluggy.ai' },
];

export function getInternalBankSyncProviders(): InternalBankSyncProvider[] {
  return INTERNAL_PROVIDERS;
}

type ScopeStatus = {
  configured: boolean;
  error?: string;
};

export type ProviderStatusMap = Record<string, ScopeStatus>;

async function getProviderStatus(
  slug: string,
  fileId: string,
): Promise<ScopeStatus> {
  try {
    if (slug === 'pluggyai') {
      const result = await send('pluggyai-status', { fileId });
      return {
        configured: Boolean((result as { configured?: boolean })?.configured),
        error: (result as { error?: string })?.error,
      };
    }
    if (slug === 'goCardless') {
      const result = await send('gocardless-status', { fileId });
      return {
        configured: Boolean((result as { configured?: boolean })?.configured),
        error: (result as { error?: string })?.error,
      };
    }
    if (slug === 'simpleFin') {
      const result = await send('simplefin-status', { fileId });
      return {
        configured: Boolean((result as { configured?: boolean })?.configured),
        error: (result as { error?: string })?.error,
      };
    }
  } catch (err) {
    return {
      configured: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  return { configured: false };
}

export function useProviderStatusMap({
  fileId,
}: {
  fileId?: string;
} = {}) {
  const syncServerStatus = useSyncServerStatus();
  const providers = useMemo(() => getInternalBankSyncProviders(), []);

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

    const fid = fileId;
    let didCancel = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const entries = await Promise.all(
          providers.map(async provider => {
            const result = await getProviderStatus(provider.slug, fid);
            return [provider.slug, result] as const;
          }),
        );

        if (!didCancel) {
          setStatusMap(Object.fromEntries(entries));
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

    load();

    return () => {
      didCancel = true;
    };
  }, [fileId, syncServerStatus, refetchToken, providers]);

  return { statusMap, isLoading, error, refetch, providers };
}
