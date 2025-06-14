import { useCallback, useEffect, useMemo } from 'react';

import { evalArithmetic } from 'loot-core/shared/arithmetic';
import { type Currency, getCurrency } from 'loot-core/shared/currencies';
import {
  amountToInteger,
  currencyToAmount,
  getNumberFormat,
  type IntegerAmount,
  integerToAmount,
  integerToCurrency,
  parseNumberFormat,
  setNumberFormat,
} from 'loot-core/shared/util';

import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

export type FormatType =
  | 'string'
  | 'number'
  | 'percentage'
  | 'financial'
  | 'financial-with-sign'
  | 'financial-no-decimals';

export type UseFormatResult = {
  (value: unknown, type?: FormatType): string;
  forEdit: (value: IntegerAmount) => string;
  fromEdit: (
    value: string,
    defaultValue?: number | null,
  ) => IntegerAmount | null;
  currency: Currency;
};

function format(
  value: unknown,
  type: FormatType,
  formatter: Intl.NumberFormat,
  decimalPlaces: number,
): string {
  switch (type) {
    case 'string': {
      const val = JSON.stringify(value);
      // eslint-disable-next-line rulesdir/typography
      if (val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') {
        return val.slice(1, -1);
      }
      return val;
    }
    case 'number':
      if (typeof value !== 'number') {
        throw new Error(
          'Value is not a number (' + typeof value + '): ' + value,
        );
      }
      return formatter.format(value);
    case 'percentage':
      return value + '%';
    case 'financial-with-sign': {
      const formatted = format(value, 'financial', formatter, decimalPlaces);
      if (typeof value === 'number' && value >= 0) {
        return '+' + formatted;
      }
      return formatted;
    }
    case 'financial-no-decimals':
    case 'financial': {
      let localValue = value;
      if (localValue == null || localValue === '' || localValue === 0) {
        return integerToCurrency(0, decimalPlaces, formatter);
      } else if (typeof localValue === 'string') {
        const parsed = parseFloat(localValue);
        localValue = isNaN(parsed) ? 0 : parsed;
      }

      if (typeof localValue !== 'number') {
        throw new Error(
          'Value is not a number (' + typeof localValue + '): ' + localValue,
        );
      }

      return integerToCurrency(localValue, decimalPlaces, formatter);
    }
    default:
      throw new Error('Unknown format type: ' + type);
  }
}

export function useFormat(): UseFormatResult {
  const [numberFormatPref] = useSyncedPref('numberFormat');
  const [hideFractionPref] = useSyncedPref('hideFraction');
  const [currencyCodePref] = useSyncedPref('currencyCode');
  const [symbolPositionPref] = useSyncedPref('currencySymbolPosition');
  const [spaceEnabledPref] = useSyncedPref(
    'currencySpaceBetweenAmountAndSymbol',
  );

  const activeCurrency = useMemo(() => {
    return getCurrency(currencyCodePref || '');
  }, [currencyCodePref]);

  const numberFormatConfig = useMemo(
    () =>
      parseNumberFormat({
        format: numberFormatPref,
        hideFraction: hideFractionPref === 'true',
      }),
    [numberFormatPref, hideFractionPref],
  );

  // Hack: keep the global number format in sync - update the settings when
  // the underlying configuration changes.
  // This should be patched by moving all number-formatting utilities away from
  // the global `getNumberFormat()` and to using the reactive `useFormat` hook.
  useEffect(() => {
    setNumberFormat(numberFormatConfig);
  }, [numberFormatConfig]);

  const applyCurrencyStyling = useCallback(
    (formattedNumericValue: string, currencySymbol: string): string => {
      if (!currencySymbol) {
        return formattedNumericValue;
      }

      const space = spaceEnabledPref === 'true' ? '\u00A0' : '';
      const position = symbolPositionPref || 'before';

      return position === 'after'
        ? `${formattedNumericValue}${space}${currencySymbol}`
        : `${currencySymbol}${space}${formattedNumericValue}`;
    },
    [symbolPositionPref, spaceEnabledPref],
  );

  const formatDisplay = useCallback(
    (value: unknown, type: FormatType = 'string'): string => {
      const isFinancialType =
        type === 'financial' ||
        type === 'financial-with-sign' ||
        type === 'financial-no-decimals';

      let displayDecimalPlaces: number | undefined;

      if (isFinancialType) {
        if (type === 'financial-no-decimals' || hideFractionPref === 'true') {
          displayDecimalPlaces = 0;
        } else {
          displayDecimalPlaces = activeCurrency.decimalPlaces;
        }
      }

      const intlFormatter = getNumberFormat({
        format: numberFormatConfig.format,
        decimalPlaces: displayDecimalPlaces,
      }).formatter;

      const baseFormattedValue = format(
        value,
        type,
        intlFormatter,
        activeCurrency.decimalPlaces,
      );

      if (isFinancialType && activeCurrency && activeCurrency.code !== '') {
        return applyCurrencyStyling(baseFormattedValue, activeCurrency.symbol);
      }

      return baseFormattedValue;
    },
    [
      activeCurrency,
      numberFormatConfig,
      applyCurrencyStyling,
      hideFractionPref,
    ],
  );

  const toAmount = useCallback(
    (value: number) => integerToAmount(value, activeCurrency.decimalPlaces),
    [activeCurrency.decimalPlaces],
  );

  const fromAmount = useCallback(
    (value: number) => amountToInteger(value, activeCurrency.decimalPlaces),
    [activeCurrency.decimalPlaces],
  );

  const forEdit = useCallback(
    (value: IntegerAmount) => {
      const amount = toAmount(value);
      const decimalPlaces =
        hideFractionPref === 'true' ? 0 : activeCurrency.decimalPlaces;
      const editFormatter = getNumberFormat({
        format: numberFormatConfig.format,
        decimalPlaces,
      }).formatter;
      return editFormatter.format(amount);
    },
    [
      toAmount,
      hideFractionPref,
      activeCurrency.decimalPlaces,
      numberFormatConfig.format,
    ],
  );

  const fromEdit = useCallback(
    (
      value: string,
      defaultValue: number | null = null,
    ): IntegerAmount | null => {
      if (value == null) {
        return defaultValue;
      }

      const trimmed = value.trim();
      if (trimmed === '') {
        return defaultValue;
      }

      let numericValue: number | null = evalArithmetic(trimmed, null);

      if (numericValue === null || isNaN(numericValue)) {
        numericValue = currencyToAmount(trimmed);
      }

      if (numericValue !== null && !isNaN(numericValue)) {
        return fromAmount(numericValue);
      }

      return defaultValue;
    },
    [fromAmount],
  );

  return Object.assign(formatDisplay, {
    forEdit,
    fromEdit,
    currency: activeCurrency,
  });
}
