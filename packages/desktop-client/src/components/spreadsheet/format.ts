import { useCallback } from 'react';
import { useSelector } from 'react-redux';

import { createSelector } from 'reselect';

import type { State } from 'loot-core/src/client/state-types';
import { integerToCurrency, getNumberFormat } from 'loot-core/src/shared/util';

/**
 * @deprecated Please do not use this directly. Use `useFormat` hook
 */
export default function format(
  value: unknown,
  type = 'string',
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
    case 'financial-with-sign':
      let formatted = format(value, 'financial', formatter);
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

const selectNumberFormat = createSelector(
  (state: State) => state.prefs.local,
  prefs =>
    getNumberFormat({
      format: prefs.numberFormat,
      hideFraction: prefs.hideFraction,
    }),
);

export function useFormat() {
  const numberFormat = useSelector(selectNumberFormat);

  return useCallback(
    (value: unknown, type = 'string') =>
      format(value, type, numberFormat.formatter),
    [numberFormat],
  );
}
