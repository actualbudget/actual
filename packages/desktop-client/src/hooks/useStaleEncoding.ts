import { useEffect } from 'react';

import { listen, send } from '@actual-app/core/platform/client/connection';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useMulticurrencyAvailable } from './useMulticurrencyAvailable';

const staleKey = ['accounts', 'stale-encoding'] as const;

/**
 * Rows from another device written in an account's previous currency
 * (MC-7.3), for an account: their count across every earlier encoding, and
 * how many earlier encodings they use. Refreshed after every applied sync
 * change to transactions or accounts.
 */
export function useStaleEncoding(accountId: string | undefined) {
  const available = useMulticurrencyAvailable();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!available) return;
    return listen('sync-event', event => {
      if (
        event.type === 'applied' &&
        event.tables.some(
          table => table === 'transactions' || table === 'accounts',
        )
      ) {
        void queryClient.invalidateQueries({ queryKey: staleKey });
      }
    });
  }, [available, queryClient]);
  const { data } = useQuery({
    queryKey: staleKey,
    queryFn: () => send('accounts/stale-encoding'),
    enabled: available,
  });
  const groups = (data ?? []).filter(group => group.account === accountId);
  return {
    count: groups.reduce((sum, group) => sum + group.count, 0),
    stamps: groups.length,
  };
}

export function invalidateStaleEncoding(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  return queryClient.invalidateQueries({ queryKey: staleKey });
}
