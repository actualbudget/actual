import { getCurrencyList } from './getCurrencyList';

import { Currency } from '.';

export const defaultCurrency: Currency = {
  code: 'XXX',
  name: 'Unknown Currency',
  minorUnits: 2,
  symbol: '$',
};

export function getCurrency(code?: string): Currency {
  if (!code) return defaultCurrency;
  const currencies = getCurrencyList();
  if (code) code = code.toUpperCase();
  if (!Object.hasOwn(currencies, code)) return defaultCurrency;
  return { code, ...currencies[code] };
}
