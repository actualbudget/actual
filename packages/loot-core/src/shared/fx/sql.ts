import { lastDayOfMonth } from '#shared/months';
import type { IntegerAmount } from '#shared/util';

import { convertAmount } from './convert';
import type { OwnLineStarts } from './ownLines';
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
  // The currencies budgeted on lines of their own, with the month (YYYYMM,
  // 0 for every month) their lines start in; spending in them gets a line
  // in its category automatically
  ownLineStarts: OwnLineStarts;
  index: RateIndex;
};

const EMPTY_STATE: SqlConversionState = {
  enabled: false,
  defaultCurrencyCode: '',
  rateMode: 'latest',
  ownLineStarts: new Map(),
  index: buildRateIndex([]),
};

let state: SqlConversionState = EMPTY_STATE;

export function setSqlConversionState({
  enabled,
  defaultCurrencyCode,
  rateMode,
  ownLineStarts = new Map(),
  rates,
}: Omit<SqlConversionState, 'index' | 'ownLineStarts'> & {
  ownLineStarts?: OwnLineStarts;
  rates: readonly RateRecord[];
}) {
  state = {
    enabled: enabled && defaultCurrencyCode !== '',
    defaultCurrencyCode,
    rateMode,
    // The default currency is budgeted on the category itself
    ownLineStarts: new Map(
      [...ownLineStarts].filter(([code]) => code !== defaultCurrencyCode),
    ),
    index: buildRateIndex(rates),
  };
}

export function resetSqlConversionState() {
  state = EMPTY_STATE;
}

export function isSqlConversionEnabled(): boolean {
  return state.enabled;
}

// Also known while the feature is off
export function getSqlDefaultCurrencyCode(): string {
  return state.defaultCurrencyCode;
}

// The currencies budgeted on lines of their own, with the month (YYYYMM, 0
// for every month) their lines start in, or null while none is
export function getSqlOwnLineStarts(): OwnLineStarts | null {
  return state.enabled && state.ownLineStarts.size > 0
    ? state.ownLineStarts
    : null;
}

// SQL dates are YYYYMMDD integers
function toDateString(date: unknown): string | undefined {
  if (typeof date === 'number' && Number.isInteger(date)) {
    const text = String(date);
    return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  }
  return typeof date === 'string' && date !== '' ? date : undefined;
}

// 1 without a rate path
function getRate(
  fromCurrency: string,
  toCurrency: string,
  date: unknown,
): number {
  return (
    findRate(state.index, fromCurrency, toCurrency, toDateString(date))?.rate ??
    1
  );
}

// Converts between any two currencies at the rate on or before `date`,
// even while multiple currencies are off
export function convertBetweenCurrencies(
  amount: IntegerAmount,
  fromCurrency: string,
  toCurrency: string,
  date: string | undefined,
): IntegerAmount {
  return (
    convertAmount(
      amount,
      toCurrency,
      getRate(fromCurrency, toCurrency, date),
    ) ?? amount
  );
}

// The rate of a budget month: the latest one on or before its last day. The
// current and later months follow the latest rate, a past month keeps its
// last one.
export function convertAtMonthRate(
  amount: IntegerAmount,
  fromCurrency: string,
  toCurrency: string,
  month: string,
): IntegerAmount {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  return convertBetweenCurrencies(
    amount,
    fromCurrency,
    toCurrency,
    lastDayOfMonth(month),
  );
}

// What an amount budgeted in `currency` is worth in the default currency in
// `month`. While multiple currencies are off such amounts count for nothing.
export function convertBudgetAmount(
  amount: IntegerAmount,
  currency: string,
  month: string,
): IntegerAmount {
  if (!state.enabled) {
    return 0;
  }
  return convertAtMonthRate(amount, currency, state.defaultCurrencyCode, month);
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

// `onDate` forces the rate of the amount's date regardless of the rate
// setting
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

  return (
    convertAmount(
      amount,
      state.defaultCurrencyCode,
      getRate(
        currency,
        state.defaultCurrencyCode,
        onDate || state.rateMode === 'historical' ? date : undefined,
      ),
    ) ?? amount
  );
}
