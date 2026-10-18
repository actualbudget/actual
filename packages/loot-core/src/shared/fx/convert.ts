import { getDecimalPlaces } from '#shared/currencies';
import { MAX_SAFE_NUMBER, safeNumber } from '#shared/util';
import type { IntegerAmount } from '#shared/util';

import { findRate } from './rates';
import type { RateIndex, RateLookup } from './rates';

// Rounds a non-negative value to an integer, half up as in decimal. In
// floating point 45 × 0.7 is 31.499999999999996, so a value close to a half
// is first rounded to 12 significant digits, or more for large values so
// they keep a few decimals and never lose whole units.
function roundHalfUp(value: number): number {
  const fraction = value % 1;
  if (fraction < 0.499 || fraction > 0.501) {
    return Math.round(value);
  }
  const integerDigits = value >= 1 ? Math.floor(Math.log10(value)) + 1 : 0;
  // A double holds no more than 17 significant digits
  const precision = Math.min(17, Math.max(12, integerDigits + 3));
  return Math.round(Number(value.toPrecision(precision)));
}

// Converts an amount into `toCurrency` at `rate`, rounded to the smallest
// unit of that currency, half away from zero so that x and -x convert to
// exact opposites. Null when the result is too large to be safe.
export function convertAmount(
  amount: IntegerAmount,
  toCurrency: string,
  rate: number,
): IntegerAmount | null {
  const unit = 10 ** Math.max(0, 2 - getDecimalPlaces(toCurrency));
  const magnitude = roundHalfUp((Math.abs(amount) * rate) / unit) * unit;
  const converted = amount < 0 && magnitude !== 0 ? -magnitude : magnitude;
  return Number.isSafeInteger(converted) &&
    Math.abs(converted) <= MAX_SAFE_NUMBER
    ? converted
    : null;
}

export type Conversion = {
  amount: IntegerAmount;
  // null when the amount was counted 1:1: no rate path exists, or the
  // rate makes the amount too large to be safe
  lookup: RateLookup | null;
};

// Converts with the rate on or before `date` (the latest rate when omitted).
// Without a rate path the amount counts 1:1, as every amount added up
// before currencies existed; so does one whose conversion isn't safe, so
// one absurd rate never breaks what is shown.
export function convertWithRates(
  amount: IntegerAmount,
  fromCurrency: string,
  toCurrency: string,
  index: RateIndex,
  date?: string,
): Conversion {
  const lookup = findRate(index, fromCurrency, toCurrency, date);
  const converted = lookup && convertAmount(amount, toCurrency, lookup.rate);
  return converted === null || converted === undefined
    ? { amount, lookup: null }
    : { amount: converted, lookup };
}

export type ConvertibleEntry = {
  id: string;
  amount: IntegerAmount;
  currency: string;
};

export type ConvertedTotal = {
  total: IntegerAmount;
  // Entries counted 1:1 because no rate path exists, or because their rate
  // gives an amount too large to add up safely
  withoutRate: Array<Pick<ConvertibleEntry, 'id' | 'currency'>>;
  // True when at least one entry used a later-dated rate
  hasFallback: boolean;
};

// Adds up entries in the target currency. An entry counts 1:1, and is
// reported like one without a rate, when its conversion isn't safe to add
// to the total.
export function convertTotal(
  entries: readonly ConvertibleEntry[],
  toCurrency: string,
  index: RateIndex,
  date?: string,
): ConvertedTotal {
  let total = 0;
  let hasFallback = false;
  const withoutRate: ConvertedTotal['withoutRate'] = [];

  for (const entry of entries) {
    const conversion = convertWithRates(
      entry.amount,
      entry.currency,
      toCurrency,
      index,
      date,
    );
    if (
      conversion.lookup &&
      Math.abs(total + conversion.amount) <= MAX_SAFE_NUMBER
    ) {
      total += conversion.amount;
      hasFallback = hasFallback || conversion.lookup.isFallback;
    } else {
      total = safeNumber(total + entry.amount);
      withoutRate.push({ id: entry.id, currency: entry.currency });
    }
  }

  return { total, withoutRate, hasFallback };
}

// The rate actually applied between two amounts, e.g. the two sides of a
// transfer between currencies: how many units of `toCurrency` one unit of
// `fromCurrency` bought, fees and spread included. Null when nothing left.
export function getEffectiveRate(
  fromAmount: IntegerAmount,
  toAmount: IntegerAmount,
): number | null {
  if (fromAmount === 0) {
    return null;
  }
  // Both amounts are stored at the same scale, whatever their currency
  return Math.abs(toAmount / fromAmount);
}
