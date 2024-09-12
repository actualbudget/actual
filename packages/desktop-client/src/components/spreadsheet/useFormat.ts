import { useCallback, useEffect, useMemo } from 'react';

import {
  getNumberFormat,
  integerToCurrency,
  isNumberFormat,
  setNumberFormat,
} from 'loot-core/src/shared/util';

import { useSyncedPref } from '../../hooks/useSyncedPref';

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
      return '' + value;
    case 'percentage':
      return value + '%';
    case 'financial-with-sign':
      const formatted = format(value, 'financial', formatter);
      if (typeof value === 'number' && value >= 0) {
        return '+' + formatted;
      }
      return formatted;
    case 'financial':
      if (value == null || value === '' || value === 0) {
        return integerToCurrency(0, formatter);
      } else if (typeof value === 'string') {
        const parsed = parseFloat(value);
        value = isNaN(parsed) ? 0 : parsed;
      }

      if (typeof value !== 'number') {
        throw new Error(
          'Value is not a number (' + typeof value + '): ' + value,
        );
      }

      return integerToCurrency(value, formatter);
    default:
      throw new Error('Unknown format type: ' + type);
  }
}

export function useFormat() {
  const [numberFormat] = useSyncedPref('numberFormat');
  const [hideFraction] = useSyncedPref('hideFraction');

  const config = useMemo(
    () => ({
      format: isNumberFormat(numberFormat) ? numberFormat : 'comma-dot',
      hideFraction: String(hideFraction) === 'true',
    }),
    [numberFormat, hideFraction],
  );

  // Hack: keep the global number format in sync - update the settings when
  // the underlying configuration changes.
  // This should be patched by moving all number-formatting utilities away from
  // the global `getNumberFormat()` and to using the reactive `useFormat` hook.
  useEffect(() => {
    setNumberFormat(config);
  }, [config]);

  return useCallback(
    (value: unknown, type: FormatType = 'string') =>
      format(value, type, getNumberFormat(config).formatter),
    [config],
  );
}
