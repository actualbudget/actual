import { useEffect, useState } from 'react';

import { send } from 'loot-core/platform/client/fetch';

export type BankSyncProvider = {
  slug: string;
  displayName: string;
  description?: string;
  version: string;
  endpoints: {
    status: string;
    accounts: string;
    transactions: string;
  };
  requiresAuth: boolean;
};

export function useBankSyncProviders() {
  const [providers, setProviders] = useState<BankSyncProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProviders() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await send('bank-sync-providers-list' as never);

        if (response && typeof response === 'object' && 'status' in response) {
          const typedResponse = response as {
            status: string;
            data?: { providers: BankSyncProvider[] };
            error?: string;
          };

          if (typedResponse.status === 'ok' && typedResponse.data) {
            setProviders(typedResponse.data.providers);
          } else {
            setError(
              typedResponse.error || 'Failed to fetch bank sync providers',
            );
            setProviders([]);
          }
        } else {
          // Fallback for when backend is not implemented yet
          setProviders([]);
        }
      } catch (err) {
        console.error('Error fetching bank sync providers:', err);
        setError((err as Error).message || 'Unknown error');
        setProviders([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProviders();
  }, []);

  return {
    providers,
    isLoading,
    error,
  };
}
