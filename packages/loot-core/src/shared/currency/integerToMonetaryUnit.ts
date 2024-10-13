import { getCurrency } from './getCurrency';
import { MonetaryUnit } from './MonetaryUnit';

import { Currency } from '.';

export function integerToMonetaryUnit(n: number, currency?: string | Currency) {
  const _currency = currency
    ? typeof currency === 'string'
      ? getCurrency(currency)
      : currency
    : getCurrency();
  return MonetaryUnit(n / 10 ** _currency.minorUnits, _currency);
}
