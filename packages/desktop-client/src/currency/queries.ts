import { send } from '@actual-app/core/platform/client/connection';
import { queryOptions } from '@tanstack/react-query';

// The currencies budgeted on their own line in a category
export const categoryCurrencyQueries = {
  all: () => ['category-currencies'],
  lists: () => [...categoryCurrencyQueries.all(), 'lists'],
  list: () =>
    queryOptions({
      queryKey: [...categoryCurrencyQueries.lists()],
      queryFn: () => send('category-currencies-get'),
      // Manually invalidated when the lines or categories change
      staleTime: Infinity,
    }),
  // The spending categories convert in `month` from currencies without a
  // line of their own, by account; invalidated with the lines
  convertedSpending: (month: string) =>
    queryOptions({
      queryKey: [...categoryCurrencyQueries.lists(), 'converted', month],
      queryFn: () => send('category-currency-converted-spending', { month }),
      staleTime: Infinity,
    }),
};

// Tables whose changes change the currency lines of categories: automatic
// lines follow spending, accounts and the settings
export const CATEGORY_CURRENCY_TABLES = [
  'category_currencies',
  'categories',
  'transactions',
  'accounts',
  'category_mapping',
  'preferences',
];

export const exchangeRateQueries = {
  all: () => ['exchange-rates'],
  lists: () => [...exchangeRateQueries.all(), 'lists'],
  list: () =>
    queryOptions({
      queryKey: [...exchangeRateQueries.lists()],
      queryFn: () => send('exchange-rates-get'),
      // Manually invalidated when rates change
      staleTime: Infinity,
    }),
};
