import { send } from '@actual-app/core/platform/client/connection';
import type { ExchangeRateEntity } from '@actual-app/core/types/models';
import { queryOptions } from '@tanstack/react-query';

export const exchangeRateQueries = {
  all: () => ['exchange-rates'],
  lists: () => [...exchangeRateQueries.all(), 'lists'],
  list: () =>
    queryOptions<ExchangeRateEntity[]>({
      queryKey: [...exchangeRateQueries.lists()],
      queryFn: async () => {
        const rates: ExchangeRateEntity[] = await send('exchange-rates-get');
        return rates;
      },
      // Manually invalidated when rates change
      staleTime: Infinity,
    }),
};
