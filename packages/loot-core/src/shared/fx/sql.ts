import { convertWithRates } from './convert';
import { buildRateIndex } from './rates';
import type { RateIndex, RateRecord } from './rates';

// Conversion used by the FX_CONVERT SQL functions, so queries can add up
// amounts of accounts in different currencies. The state lives in memory
// because SQL functions must answer synchronously; the server keeps it in
// sync with the budget's exchange rates and preferences.
type SqlConversionState = {
  enabled: boolean;
  defaultCurrencyCode: string;
  // 'historical' converts with the rate on or before each amount's date,
  // 'latest' with the most recent rate
  rateMode: 'latest' | 'historical';
  index: RateIndex;
};

let state: SqlConversionState = {
  enabled: false,
  defaultCurrencyCode: '',
  rateMode: 'latest',
  index: buildRateIndex([]),
};

export function setSqlConversionState({
  enabled,
  defaultCurrencyCode,
  rateMode,
  rates,
}: Omit<SqlConversionState, 'index'> & { rates: readonly RateRecord[] }) {
  state = {
    enabled: enabled && defaultCurrencyCode !== '',
    defaultCurrencyCode,
    rateMode,
    index: buildRateIndex(rates),
  };
}

// Whether amounts are converted at all; while multiple currencies are off
// queries can use amounts as they are
export function isSqlConversionEnabled(): boolean {
  return state.enabled;
}

// SQL dates are YYYYMMDD integers
function toDateString(date: unknown): string | undefined {
  if (typeof date === 'number' && Number.isInteger(date)) {
    const text = String(date);
    return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  }
  return typeof date === 'string' && date !== '' ? date : undefined;
}

// Converts an amount of an account in `currency` into the default currency
// at the latest rate, e.g. for projections into the future
export function convertToDefaultCurrency(
  amount: number,
  currency: string | null | undefined,
): number {
  const converted = convertSqlAmount(amount, currency, undefined, false);
  return typeof converted === 'number' ? converted : amount;
}

// Converts an amount of an account in `currency` into the default
// currency. Amounts of accounts without a currency, or in the default
// currency, are returned as they are, as is everything while the feature
// is off. `onDate` forces the rate of the amount's date regardless of the
// rate setting.
export function convertSqlAmount(
  amount: unknown,
  currency: unknown,
  date: unknown,
  onDate: boolean,
): unknown {
  if (
    typeof amount !== 'number' ||
    !state.enabled ||
    typeof currency !== 'string' ||
    currency === '' ||
    currency === state.defaultCurrencyCode
  ) {
    return amount;
  }

  try {
    return convertWithRates(
      amount,
      currency,
      state.defaultCurrencyCode,
      state.index,
      onDate || state.rateMode === 'historical'
        ? toDateString(date)
        : undefined,
    ).amount;
  } catch {
    // A conversion too large to be safe keeps the original amount rather
    // than failing the whole query
    return amount;
  }
}
