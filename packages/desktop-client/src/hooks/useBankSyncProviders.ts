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

        const response = await send('bank-sync-providers-list');

        if (
          response &&
          typeof response === 'object' &&
          'providers' in response
        ) {
          const typedResponse = response as {
            providers: BankSyncProvider[];
          };

          setProviders(typedResponse.providers);
        } else {
          // Fallback for when backend is not implemented yet
          setError('Invalid response format from server');
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
