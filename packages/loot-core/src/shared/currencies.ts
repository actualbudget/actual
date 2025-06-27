import { t } from 'i18next';

export type Currency = {
  code: string;
  symbol: string;
  name: string;
  decimalPlaces: number;
};

// When adding a new currency with a higher decimal precision, make sure to update
// the MAX_SAFE_NUMBER in util.ts.
export const currencies: Currency[] = [
  { code: '', name: 'None', symbol: '', decimalPlaces: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', decimalPlaces: 2 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr.', decimalPlaces: 2 },
  { code: 'CNY', name: 'Yuan Renminbi', symbol: '¥', decimalPlaces: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2 },
  { code: 'GBP', name: 'Pound Sterling', symbol: '£', decimalPlaces: 2 },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimalPlaces: 2 },
  // { code: 'JPY', name: 'Yen', symbol: '¥', decimalPlaces: 0 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimalPlaces: 2 },
  { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2 },
];

export function getCurrency(code: string): Currency {
  return currencies.find(c => c.code === code) || currencies[0];
}

export function getLocalizedCurrencyOption(
  currency: Currency,
): [string, string] {
  if (currency.code === '') {
    return [currency.code, t('None')];
  }
  const name = t(currency.name);
  return [currency.code, `${currency.code} - ${name} (${currency.symbol})`];
}
