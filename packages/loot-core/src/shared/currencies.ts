import { useMemo, useCallback } from 'react';

import { t } from 'i18next';

import { getNumberFormat, NumberFormats } from './number-format';
import { looselyParseAmount } from './util';

export type Currency = {
  code: string;
  symbol: string;
  name: string;
  decimalPlaces: number;
};

export type Amount = number; // Floating-point representation (e.g., 123.45)
export type IntegerAmount = number; // Integer representation (e.g., 12345 for $123.45)
export type CurrencyAmount = string; // Formatted string (e.g., "$123.45")

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
  { code: 'JPY', name: 'Yen', symbol: '¥', decimalPlaces: 0 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimalPlaces: 2 },
  { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2 },
];

/**
 * Retrieves the currency object for a given code. Defaults to 'None'.
 */
export function getCurrency(code: string): Currency {
  return currencies.find(c => c.code === code) || currencies[0];
}

/**
 * Converts an integer amount (e.g., 12345) to a floating-point amount (e.g., 123.45)
 * based on the specified decimal places.
 */
export function integerToAmount(
  integerAmount: IntegerAmount | null | undefined,
  decimalPlaces = 2,
): Amount {
  if (integerAmount == null) {
    return 0;
  }
  return Number(integerAmount) / 10 ** decimalPlaces;
}

/**
 * Converts a floating-point amount (e.g., 123.45) to an integer amount (e.g., 12345)
 * based on the specified decimal places. Rounds to the nearest integer.
 */
export function amountToInteger(
  amount: Amount | null | undefined,
  decimalPlaces = 2,
): IntegerAmount {
  if (amount == null) {
    return 0;
  }
  return Math.round(Number(amount) * 10 ** decimalPlaces);
}

/**
 * Parses a formatted currency string into an integer amount using the currency's decimal places.
 * Note: This relies on looselyParseAmount which might need review based on separator handling.
 */
export function currencyToInteger(
  currencyAmount: CurrencyAmount | null | undefined,
  decimalPlaces = 2,
): IntegerAmount | null {
  if (currencyAmount == null) return null;
  const amount = looselyParseAmount(currencyAmount, decimalPlaces); // Assumes looselyParseAmount handles separators correctly
  return amount === null ? null : amountToInteger(amount, decimalPlaces);
}

/**
 * Parses a formatted currency string into a floating-point amount using the currency's decimal places.
 * Note: This relies on looselyParseAmount which might need review based on separator handling.
 */
export function currencyToAmount(
  currencyAmount: CurrencyAmount | null | undefined,
  decimalPlaces = 2,
): Amount | null {
  if (currencyAmount == null) return null;
  return looselyParseAmount(currencyAmount, decimalPlaces); // Assumes looselyParseAmount handles separators correctly
}

/**
 * Provides the currently selected currency object based on user preferences.
 */
// export function useCurrentCurrency(): Currency {
//   const [currencyCode] = useSyncedPref('currencyCode');
//   return useMemo(() => getCurrency(currencyCode), [currencyCode]);
// }

/**
 * Provides a memoized Intl.NumberFormat instance configured for the current currency
 * and user preferences, along with related currency info and symbol application helper.
 */
export function useCurrencyFormatter({
  numberFormat,
  hideFraction,
  currencyCode,
  currencySymbolPosition,
  currencySpaceEnabled,
}: {
  numberFormat: NumberFormats | string | undefined;
  hideFraction: boolean | undefined;
  currencyCode: string | null | undefined;
  currencySymbolPosition: string | null | undefined;
  currencySpaceEnabled: string | boolean | null | undefined;
}) {
  const currency = useMemo(() => getCurrency(currencyCode), [currencyCode]);

  const { formatter } = useMemo(() => {
    return getNumberFormat({
      format: numberFormat as NumberFormats,
      hideFraction: !!hideFraction,
      decimalPlaces: currency.decimalPlaces,
    });
  }, [numberFormat, hideFraction, currency]);

  const applyCurrencySymbol = useCallback(
    (formattedValue: string): string => {
      if (!currency.code) {
        return formattedValue;
      }
      const space =
        currencySpaceEnabled === true || currencySpaceEnabled === 'true'
          ? ' '
          : '';
      const position = currencySymbolPosition || 'before';

      return position === 'after'
        ? `${formattedValue}${space}${currency.symbol}`
        : `${currency.symbol}${space}${formattedValue}`;
    },
    [currency, currencySymbolPosition, currencySpaceEnabled],
  );

  return {
    /** The configured Intl.NumberFormat instance for the current currency's number part */
    formatter,
    /** The current currency object */
    currency,
    /** Helper function to apply the currency symbol based on preferences */
    applyCurrencySymbol,
  };
}

/**
 * Provides a localized string representation for a currency option (e.g., for dropdowns).
 */
export function getLocalizedCurrencyOption(
  currency: Currency,
): [string, string] {
  if (currency.code === '') {
    return ['', t('None')];
  }
  return [
    currency.code,
    `${currency.code} - ${t(currency.name)} (${currency.symbol})`,
  ];
}
