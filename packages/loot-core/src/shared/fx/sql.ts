import type { IntegerAmount } from '#shared/util';

import { convertAmount } from './convert';
import { getEffectiveCurrency } from './currency';
import { buildRateIndex, findRate } from './rates';
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

const EMPTY_STATE: SqlConversionState = {
  enabled: false,
  defaultCurrencyCode: '',
  rateMode: 'latest',
  index: buildRateIndex([]),
};

let state: SqlConversionState = EMPTY_STATE;

// Rates already looked up, per pair and date. Queries convert row by row
// and most rows share a few currencies and dates, so each lookup only runs
// once until the rates or settings change.
const MAX_CACHED_RATES = 100_000;
const rateCache = new Map<string, number>();

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
  rateCache.clear();
}

// Forgets the rates and settings of a budget, e.g. when it is closed
export function resetSqlConversionState() {
  state = EMPTY_STATE;
  rateCache.clear();
}

// Whether amounts are converted at all; while multiple currencies are off
// queries can use amounts as they are
export function isSqlConversionEnabled(): boolean {
  return state.enabled;
}

// The budget's default currency, also known while the feature is off
export function getSqlDefaultCurrencyCode(): string {
  return state.defaultCurrencyCode;
}

// SQL dates are YYYYMMDD integers
function toDateString(date: unknown): string | undefined {
  if (typeof date === 'number' && Number.isInteger(date)) {
    const text = String(date);
    return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  }
  return typeof date === 'string' && date !== '' ? date : undefined;
}

// The rate on or before `date` (the latest rate without one), or 1 when no
// rate path exists. SQL dates are only formatted when their rate isn't
// cached yet.
function getRate(
  fromCurrency: string,
  toCurrency: string,
  date: unknown,
): number {
  const key = `${fromCurrency}>${toCurrency}@${String(date ?? '')}`;
  let rate = rateCache.get(key);
  if (rate === undefined) {
    // As in convertWithRates
    rate =
      findRate(state.index, fromCurrency, toCurrency, toDateString(date))
        ?.rate ?? 1;
    if (rateCache.size >= MAX_CACHED_RATES) {
      rateCache.clear();
    }
    rateCache.set(key, rate);
  }
  return rate;
}

// Converts between two currencies with the rate on or before `date`, even
// while the feature is off, e.g. for the other side of a transfer between
// accounts in different currencies. Without a rate the amount counts 1:1,
// rounded to the smallest unit of `toCurrency`. A conversion too large to be
// safe keeps the original amount.
export function convertBetweenCurrencies(
  amount: IntegerAmount,
  fromCurrency: string,
  toCurrency: string,
  date: string | undefined,
): IntegerAmount {
  try {
    return convertAmount(
      amount,
      toCurrency,
      getRate(fromCurrency, toCurrency, date),
    );
  } catch {
    return amount;
  }
}

// The other side of a transfer, in the currency of its own account: the
// amount as it is within one currency, converted between two. While
// multiple currencies are off transfers mirror their amount, as they
// always have.
export function convertTransferAmount(
  amount: IntegerAmount,
  fromAccountCurrency: string | null | undefined,
  toAccountCurrency: string | null | undefined,
  date: string | undefined,
): IntegerAmount {
  if (!state.enabled) {
    return amount;
  }
  const from = getEffectiveCurrency(
    fromAccountCurrency,
    state.defaultCurrencyCode,
  );
  const to = getEffectiveCurrency(toAccountCurrency, state.defaultCurrencyCode);
  return from && to && from !== to
    ? convertBetweenCurrencies(amount, from, to, date)
    : amount;
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
    return convertAmount(
      amount,
      state.defaultCurrencyCode,
      getRate(
        currency,
        state.defaultCurrencyCode,
        onDate || state.rateMode === 'historical' ? date : undefined,
      ),
    );
  } catch {
    // A conversion too large to be safe keeps the original amount rather
    // than failing the whole query
    return amount;
  }
}
