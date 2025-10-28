import { useEffect, useRef } from 'react';

import { send } from 'loot-core/platform/client/fetch';

import { useMultiCurrency } from './useMultiCurrency';

/**
 * Hook to automatically poll exchange rates from the backend.
 * Only runs when multi-currency is enabled.
 * Fetches exchange rates at the interval specified by the backend service.
 */
export function useExchangeRates() {
  const { isMultiCurrencyEnabled } = useMultiCurrency();
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isMultiCurrencyEnabled) {
      return;
    }

    async function setupPolling() {
      try {
        // Get the update interval from the backend
        const updateIntervalMs = await send(
          'exchange-rates-get-update-interval',
        );

        // Immediately fetch rates once
        await fetchRates();

        // Set up periodic polling
        intervalIdRef.current = setInterval(async () => {
          await fetchRates();
        }, updateIntervalMs);
      } catch (error) {
        console.error('Failed to setup exchange rate polling:', error);
      }
    }

    async function fetchRates() {
      try {
        // Backend will automatically determine base currency and all needed currencies
        await send('exchange-rates-fetch', {});
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
      }
    }

    setupPolling();

    // Cleanup on unmount
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [isMultiCurrencyEnabled]);
}
