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
  { code: '', name: t('None'), symbol: '', decimalPlaces: 2 },
  { code: 'AUD', name: t('Australian Dollar'), symbol: 'A$', decimalPlaces: 2 },
  { code: 'CAD', name: t('Canadian Dollar'), symbol: 'CA$', decimalPlaces: 2 },
  { code: 'CHF', name: t('Swiss Franc'), symbol: 'Fr.', decimalPlaces: 2 },
  { code: 'CNY', name: t('Yuan Renminbi'), symbol: '¥', decimalPlaces: 2 },
  { code: 'EUR', name: t('Euro'), symbol: '€', decimalPlaces: 2 },
  { code: 'GBP', name: t('Pound Sterling'), symbol: '£', decimalPlaces: 2 },
  { code: 'HKD', name: t('Hong Kong Dollar'), symbol: 'HK$', decimalPlaces: 2 },
  // { code: 'JPY', name: t('Yen'), symbol: '¥', decimalPlaces: 0 },
  { code: 'SGD', name: t('Singapore Dollar'), symbol: 'S$', decimalPlaces: 2 },
  { code: 'USD', name: t('US Dollar'), symbol: '$', decimalPlaces: 2 },
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
  return [
    currency.code,
    `${currency.code} - ${currency.name} (${currency.symbol})`,
  ];
}
