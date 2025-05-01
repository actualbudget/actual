import { useCallback, useMemo } from 'react';

import {
  integerToAmount,
  useCurrencyFormatter,
} from 'loot-core/shared/currencies';
import {
  getNumberFormat,
  type NumberFormats,
} from 'loot-core/shared/number-format';

import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

export type FormatType =
  | 'string'
  | 'number'
  | 'percentage'
  | 'financial'
  | 'financial-with-sign';

function format(
  value: unknown,
  type: FormatType = 'string',
  formatter?: Intl.NumberFormat,
): string {
  switch (type) {
    case 'string':
      const val = JSON.stringify(value);
      // eslint-disable-next-line rulesdir/typography
      if (val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') {
        return val.slice(1, -1);
      }
      return val;
    case 'number':
      if (typeof value === 'number') {
        return formatter ? formatter.format(value) : String(value);
      }
      return String(value);
    case 'percentage':
      return (typeof value === 'number' ? value : '0') + '%';
    case 'financial':
      if (value == null || value === '') {
        value = 0;
      }

      let integerValue: number;
      if (typeof value === 'number') {
        integerValue = value;
      } else {
        const parsed = parseInt(String(value).replace(/[^\d-]/g, ''));
        integerValue = isNaN(parsed) ? 0 : parsed;
      }

      const decimalPlaces =
        formatter?.resolvedOptions().maximumFractionDigits ?? 2;
      const floatAmount = integerToAmount(integerValue, decimalPlaces);

      return formatter ? formatter.format(floatAmount) : String(floatAmount);
    default:
      throw new Error('Unknown format type: ' + type);
  }
}

export function useFormat() {
  const [numberFormatPref] = useSyncedPref('numberFormat');
  const [hideFractionPref] = useSyncedPref('hideFraction');
  const [currencyCodePref] = useSyncedPref('currencyCode');
  const [symbolPositionPref] = useSyncedPref('currencySymbolPosition');
  const [spaceEnabledPref] = useSyncedPref(
    'currencySpaceBetweenAmountAndSymbol',
  );

  const {
    formatter: currencyFormatter, // The Intl.NumberFormat instance for the number part
    currency, // The current currency object
    applyCurrencySymbol, // The helper to add the symbol correctly
  } = useCurrencyFormatter({
    numberFormat: numberFormatPref,
    hideFraction: hideFractionPref === 'true',
    currencyCode: currencyCodePref,
    currencySymbolPosition: symbolPositionPref,
    currencySpaceEnabled: spaceEnabledPref,
  });

  const genericNumberFormatter = useMemo(() => {
    return getNumberFormat({
      format: numberFormatPref as NumberFormats,
    }).formatter;
  }, [numberFormatPref]);

  return useCallback(
    (value: unknown, type: FormatType = 'string') => {
      const isFinancialType =
        type === 'financial' || type === 'financial-with-sign';

      let baseFormatted: string;
      let shouldApplySymbol = false;

      if (isFinancialType) {
        baseFormatted = format(value, 'financial', currencyFormatter);
        shouldApplySymbol = !!currency.code;

        if (type === 'financial-with-sign') {
          let numericValue = 0;
          if (typeof value === 'number') {
            numericValue = value;
          } else if (typeof value === 'string') {
            // Attempt to parse integer value from string
            numericValue = parseInt(value.replace(/[^\d-]/g, '')) || 0;
          }
          // Add '+' sign if non-negative
          if (numericValue >= 0) {
            baseFormatted = '+' + baseFormatted;
          }
        }
      } else if (type === 'number') {
        baseFormatted = format(value, 'number', genericNumberFormatter);
      } else {
        baseFormatted = format(value, type /*, undefined */);
      }

      if (shouldApplySymbol) {
        return applyCurrencySymbol(baseFormatted);
      }

      return baseFormatted;
    },
    [currencyFormatter, currency, applyCurrencySymbol, genericNumberFormatter],
  );
}
