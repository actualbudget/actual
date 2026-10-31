import { useEffect, useState } from 'react';

import { listen, send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import { useMulticurrencyAvailable } from './useMulticurrencyAvailable';

const ESTIMATE_TABLES = [
  'transactions',
  'accounts',
  'exchange_rates',
  'preferences',
];

const estimatesKey = ['accounts', 'current-estimates'] as const;

// One sync subscription however many displays read the estimates, so a
// change triggers one read.
let subscribers = 0;
let unlisten: (() => void) | null = null;

function subscribe(queryClient: QueryClient) {
  if (subscribers++ === 0) {
    unlisten = listen('sync-event', event => {
      if (
        event.type === 'applied' &&
        event.tables.some(table => ESTIMATE_TABLES.includes(table))
      ) {
        void queryClient.invalidateQueries({ queryKey: estimatesKey });
      }
    });
  }
  return () => {
    if (--subscribers === 0) {
      unlisten?.();
      unlisten = null;
    }
  };
}

/**
 * Current-rate estimates for foreign accounts and converted group totals,
 * shared by every display and refreshed after relevant sync changes and
 * when the local day changes. Null while unavailable or when the latest
 * read failed.
 */
export function useCurrentEstimates() {
  const available = useMulticurrencyAvailable();
  const queryClient = useQueryClient();
  const [day, setDay] = useState(() => monthUtils.currentDay());

  useEffect(() => {
    const timer = setInterval(() => setDay(monthUtils.currentDay()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => subscribe(queryClient), [queryClient]);

  const { data, isError } = useQuery({
    queryKey: [...estimatesKey, day],
    queryFn: () => send('accounts/current-estimates'),
    enabled: available,
    retry: false,
    // The read runs in the local worker, which works offline.
    networkMode: 'always',
    // A day's result stays current until a relevant change invalidates it,
    // so displays mounting later reuse it.
    staleTime: Infinity,
  });
  return available && !isError ? (data ?? null) : null;
}
