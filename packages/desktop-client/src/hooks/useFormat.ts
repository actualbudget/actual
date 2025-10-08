import { useCallback, useEffect, useMemo } from 'react';

import { evalArithmetic } from 'loot-core/shared/arithmetic';
import { getCurrency, type Currency } from 'loot-core/shared/currencies';
import {
  amountToInteger,
  formattedToAmount,
  getNumberFormat,
  integerToAmount,
  integerToFormatted,
  parseNumberFormat,
  setNumberFormat,
  type IntegerAmount,
} from 'loot-core/shared/util';

import { useSyncedPref } from './useSyncedPref';

export type FormatType =
  | 'string'
  | 'number'
  | 'percentage'
  | 'financial'
  | 'financial-with-sign'
  | 'financial-no-decimals';

export type UseFormatResult = {
  (value: unknown, type?: FormatType, currencyCode?: string | null): string;
  forEdit: (value: IntegerAmount, currencyCode?: string | null) => string;
  fromEdit: (
    value: string,
    defaultValue?: number | null,
    currencyCode?: string | null,
  ) => IntegerAmount | null;
  currency: Currency;
};

export type FormatResult = {
  numericValue?: number;
  formattedString: string;
};

function format(
  value: unknown,
  type: FormatType,
  formatter: Intl.NumberFormat | { format: (value: number) => string },
  decimalPlaces: number,
): FormatResult {
  switch (type) {
    case 'string': {
      const val = JSON.stringify(value);

      if (val.charAt(0) === '"' && val.charAt(val.length - 1) === '"') {
        return { formattedString: val.slice(1, -1) };
      }
      return { formattedString: val };
    }
    case 'number':
      if (typeof value !== 'number') {
        throw new Error(
          'Value is not a number (' + typeof value + '): ' + value,
        );
      }
      return { numericValue: value, formattedString: formatter.format(value) };
    case 'percentage':
      return { formattedString: value + '%' };
    case 'financial-with-sign':
    case 'financial-no-decimals':
    case 'financial': {
      let localValue = value;
      if (localValue == null || localValue === '') {
        localValue = 0;
      } else if (typeof localValue === 'string') {
        // This case is generally flawed, but we need to support it for
        // backwards compatibility for now.
        // For example, it is not clear how the string might look like
        // The Budget sends 12300, if the user inputs 123.00, but
        // there might be other components that send 123 with the same user input.
        // Ideally the string case will be removed in the future. We should always
        // use the IntegerAmount.
        // The parseInt with the replace is a workaround for the case and looks like
        // the "least wrong" solution.
        const integerString = localValue.replace(/[^\d-]/g, '');
        const parsed = parseInt(integerString, 10);
        if (isNaN(parsed)) {
          throw new Error(`Invalid numeric value: ${localValue}`);
        }
        localValue = parsed;
      }

      if (typeof localValue !== 'number') {
        throw new Error(
          'Value is not a number (' + typeof localValue + '): ' + localValue,
        );
      }

      return {
        numericValue: localValue,
        formattedString: integerToFormatted(
          localValue,
          formatter,
          decimalPlaces,
        ),
      };
    }
    default:
      throw new Error('Unknown format type: ' + type);
  }
}

export function useFormat(): UseFormatResult {
  const [numberFormatPref] = useSyncedPref('numberFormat');
  const [hideFractionPref] = useSyncedPref('hideFraction');
  const [defaultCurrencyCodePref] = useSyncedPref('defaultCurrencyCode');
  const [symbolPositionPref] = useSyncedPref('currencySymbolPosition');
  const [spaceEnabledPref] = useSyncedPref(
    'currencySpaceBetweenAmountAndSymbol',
  );

  const activeCurrency = useMemo(() => {
    return getCurrency(defaultCurrencyCodePref || '');
  }, [defaultCurrencyCodePref]);

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

      let sign = '';
      let valueWithoutSign = formattedNumericValue;
      if (formattedNumericValue.startsWith('-')) {
        sign = '-';
        valueWithoutSign = formattedNumericValue.slice(1);
      }

      const space = spaceEnabledPref === 'true' ? '\u202F' : '';
      const position = symbolPositionPref || 'before';

      const styledAmount =
        position === 'after'
          ? `${valueWithoutSign}${space}${currencySymbol}`
          : `\u202A${currencySymbol}\u202C${space}${valueWithoutSign}`;

      return sign + styledAmount;
    },
    [symbolPositionPref, spaceEnabledPref],
  );

  const formatDisplay = useCallback(
    (
      value: unknown,
      type: FormatType = 'string',
      currencyCode?: string | null,
    ): string => {
      // Use the provided currency code, or fall back to the default
      const currency = currencyCode
        ? getCurrency(currencyCode)
        : activeCurrency;

      const isFinancialType =
        type === 'financial' ||
        type === 'financial-with-sign' ||
        type === 'financial-no-decimals';

      let displayDecimalPlaces: number | undefined;

      if (isFinancialType) {
        if (type === 'financial-no-decimals' || hideFractionPref === 'true') {
          displayDecimalPlaces = 0;
        } else {
          displayDecimalPlaces = currency.decimalPlaces;
        }
      }

      // Use the currency's number format if specified, otherwise use the user's preference
      const formatToUse = currencyCode
        ? currency.numberFormat
        : numberFormatConfig.format;

      const intlFormatter = getNumberFormat({
        format: formatToUse,
        decimalPlaces: displayDecimalPlaces,
      }).formatter;

      const { numericValue, formattedString } = format(
        value,
        type,
        intlFormatter,
        currency.decimalPlaces,
      );

      let styledValue = formattedString;
      if (isFinancialType && currency && currency.code !== '') {
        styledValue = applyCurrencyStyling(formattedString, currency.symbol);
      }

      if (
        type === 'financial-with-sign' &&
        numericValue != null &&
        numericValue >= 0
      ) {
        return '+' + styledValue;
      }
      return styledValue;
    },
    [
      activeCurrency,
      numberFormatConfig,
      applyCurrencyStyling,
      hideFractionPref,
    ],
  );

  const forEdit = useCallback(
    (value: IntegerAmount, currencyCode?: string | null) => {
      const currency = currencyCode
        ? getCurrency(currencyCode)
        : activeCurrency;
      const amount = integerToAmount(value, currency.decimalPlaces);
      const decimalPlaces =
        hideFractionPref === 'true' ? 0 : currency.decimalPlaces;
      const formatToUse = currencyCode
        ? currency.numberFormat
        : numberFormatConfig.format;
      const editFormatter = getNumberFormat({
        format: formatToUse,
        decimalPlaces,
      }).formatter;
      return editFormatter.format(amount);
    },
    [hideFractionPref, activeCurrency, numberFormatConfig.format],
  );

  const fromEdit = useCallback(
    (
      value: string,
      defaultValue: number | null = null,
      currencyCode?: string | null,
    ): IntegerAmount | null => {
      if (value == null) {
        return defaultValue;
      }

      const trimmed = value.trim();
      if (trimmed === '') {
        return defaultValue;
      }

      // strip directional formatting characters and letters
      const normalized = trimmed
        .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
        .replace(/\p{L}+/gu, '');
      let numericValue: number | null = evalArithmetic(normalized, null);

      if (numericValue === null || isNaN(numericValue)) {
        numericValue = formattedToAmount(trimmed);
      }

      if (numericValue !== null && !isNaN(numericValue)) {
        const currency = currencyCode
          ? getCurrency(currencyCode)
          : activeCurrency;
        return amountToInteger(numericValue, currency.decimalPlaces);
      }

      return defaultValue;
    },
    [activeCurrency],
  );

  return Object.assign(formatDisplay, {
    forEdit,
    fromEdit,
    currency: activeCurrency,
  });
}
