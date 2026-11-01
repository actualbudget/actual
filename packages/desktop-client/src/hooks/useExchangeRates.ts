import { useMemo } from 'react';

import { buildRateIndex } from '@actual-app/core/shared/fx/rates';
import type { RateIndex } from '@actual-app/core/shared/fx/rates';
import type { ExchangeRateEntity } from '@actual-app/core/types/models';
import { useQuery } from '@tanstack/react-query';

import { exchangeRateQueries } from '#currency/queries';

type ExchangeRatesSnapshot = {
  exchangeRates: readonly ExchangeRateEntity[];
  rateIndex: RateIndex;
  isLoading: boolean;
};

const EMPTY_INDEX = buildRateIndex([]);

// Rates are only loaded while `enabled`, so budgets that don't use
// multiple currencies never query them
export function useExchangeRates({
  enabled = true,
}: { enabled?: boolean } = {}): ExchangeRatesSnapshot {
  const { data, isPending } = useQuery({
    ...exchangeRateQueries.list(),
    enabled,
  });

  return useMemo(
    () =>
      enabled && data && !isPending
        ? {
            exchangeRates: data,
            rateIndex: buildRateIndex(data),
            isLoading: false,
          }
        : { exchangeRates: [], rateIndex: EMPTY_INDEX, isLoading: enabled },
    [data, enabled, isPending],
  );
}
