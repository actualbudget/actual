import { useCallback, useEffect, useMemo } from 'react';

import {
  getNumberFormat,
  isNumberFormat,
  setNumberFormat,
} from 'loot-core/src/shared/util';

import { useSyncedPref } from '../../hooks/useSyncedPref';
import {
  type Currency,
  getCurrency,
  integerToMonetaryUnit,
} from 'loot-core/shared/currency';
import {
  MonetaryUnitDisplayFormat
} from 'loot-core/shared/currency/MonetaryUnit';

type FormatValueType = string | number | unknown;

export type FormatType =
  | 'string'
  | 'number'
  | 'percentage'
  | 'financial'
  | 'financial-with-sign';

function format(
  value: FormatValueType,
  type: FormatType = 'string',
  currencyCode?: string,
  options?: MonetaryUnitDisplayFormat,
  formatter?: Intl.NumberFormat,
): string {
  const currency = getCurrency(currencyCode);
  var result = '';

  switch (type) {
    case 'string':
      const val = JSON.stringify(value);
      // eslint-disable-next-line rulesdir/typography
      if (val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') {
        return val.slice(1, -1);
      }
      return val;
    case 'number':
      return '' + value;
    case 'percentage':
      return value + '%';
    case 'financial-with-sign':
      const formatted = format(value, 'financial', currencyCode, options, formatter);
      if (typeof value === 'number' && value >= 0) {
        result = '+' + formatted;
      } else {
        result = formatted;
      }
      break;
    case 'financial':
      if (value == null || value === '' || value === 0) {
//        result = integerToCurrency(0, formatter, currencyCode);
        result = integerToMonetaryUnit(0, currencyCode).toString(options);
        break;
      } else if (typeof value === 'string') {
        const parsed = parseFloat(value);
        value = isNaN(parsed) ? 0 : parsed;
      }

      if (typeof value !== 'number') {
        throw new Error(
          'Value is not a number (' + typeof value + '): ' + value,
        );
      }

//      result = integerToCurrency(value, formatter, currencyCode);
      result = integerToMonetaryUnit(value, currencyCode).toString(options);
      break;
    default:
      throw new Error('Unknown format type: ' + type);
  }

  return result;
}

export function useFormat(code?: string) {
  const [numberFormat] = useSyncedPref('numberFormat');
  const [hideFraction] = useSyncedPref('hideFraction');
  const [budgetCurrency] = useSyncedPref('budgetCurrency');
  const [displayCurrencySymbol] = useSyncedPref('displayCurrencySymbol');

  const config = useMemo(
    () => ({
      format: isNumberFormat(numberFormat) ? numberFormat : 'comma-dot',
      hideFraction: String(hideFraction) === 'true',
      currencyCode: code ? code : budgetCurrency,
      displayCurrencySymbol,
    }),
    [numberFormat, hideFraction, budgetCurrency, code, displayCurrencySymbol],
  );

  // Hack: keep the global number format in sync - update the settings when
  // the underlying configuration changes.
  // This should be patched by moving all number-formatting utilities away from
  // the global `getNumberFormat()` and to using the reactive `useFormat` hook.
  useEffect(() => {
    setNumberFormat(config);
  }, [config]);

  return useCallback(
    (value: FormatValueType, type: FormatType = 'string', currency?: string | Currency) =>
      format(
        value,
        type,
        currency ? (typeof currency === 'string' ? currency : currency.code) : (code ? code : budgetCurrency),
        { locale: getNumberFormat(config).locale, showSymbol: displayCurrencySymbol === 'true', postSymbol: false },
        getNumberFormat(config).formatter
      ),
    [config],
  );
}
