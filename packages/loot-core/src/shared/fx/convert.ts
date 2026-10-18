import { getDecimalPlaces } from '#shared/currencies';
import { MAX_SAFE_NUMBER, safeNumber } from '#shared/util';
import type { IntegerAmount } from '#shared/util';

import { findRate } from './rates';
import type { RateIndex, RateLookup } from './rates';

// Conversions run for every amount of a query, while `getDecimalPlaces`
// searches the whole list of currencies, so the places are kept by code
const decimalPlacesByCode = new Map<string, number>();

function getCachedDecimalPlaces(currencyCode: string): number {
  let places = decimalPlacesByCode.get(currencyCode);
  if (places === undefined) {
    places = getDecimalPlaces(currencyCode);
    decimalPlacesByCode.set(currencyCode, places);
  }
  return places;
}

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

// Converts an amount stored in `fromCurrency` minor units into
// `toCurrency` minor units. Rounds half away from zero so that x and -x
// always convert to exact opposites.
export function convertAmount(
  amount: IntegerAmount,
  fromCurrency: string,
  toCurrency: string,
  rate: number,
): IntegerAmount {
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error('convertAmount: invalid rate ' + rate);
  }

  const scale =
    10 **
    (getCachedDecimalPlaces(toCurrency) - getCachedDecimalPlaces(fromCurrency));
  const magnitude = roundHalfUp(Math.abs(amount) * rate * scale);
  return safeNumber(amount < 0 && magnitude !== 0 ? -magnitude : magnitude);
}

export type Conversion = {
  amount: IntegerAmount;
  // null when no rate path exists and the amount was counted 1:1
  lookup: RateLookup | null;
};

// Converts with the rate on or before `date` (the latest rate when omitted).
// Without any rate path the amount counts 1:1, which is how every amount
// was added up before currencies existed.
export function convertWithRates(
  amount: IntegerAmount,
  fromCurrency: string,
  toCurrency: string,
  index: RateIndex,
  date?: string,
): Conversion {
  const lookup = findRate(index, fromCurrency, toCurrency, date);
  return {
    amount: convertAmount(amount, fromCurrency, toCurrency, lookup?.rate ?? 1),
    lookup,
  };
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

// The conversion of an entry, or null when it isn't safe to add to `total`,
// e.g. because a mistyped rate makes the amount huge
function convertEntry(
  entry: ConvertibleEntry,
  toCurrency: string,
  index: RateIndex,
  date: string | undefined,
  total: IntegerAmount,
): Conversion | null {
  try {
    const conversion = convertWithRates(
      entry.amount,
      entry.currency,
      toCurrency,
      index,
      date,
    );
    return Math.abs(total + conversion.amount) <= MAX_SAFE_NUMBER
      ? conversion
      : null;
  } catch {
    return null;
  }
}

// Adds up entries in the target currency. One absurd rate never breaks the
// whole total: an entry whose conversion isn't safe counts 1:1 and is
// reported like one without a rate.
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
    const conversion = convertEntry(entry, toCurrency, index, date, total);
    let amount: IntegerAmount;
    if (conversion?.lookup) {
      amount = conversion.amount;
      hasFallback = hasFallback || conversion.lookup.isFallback;
    } else {
      amount =
        conversion?.amount ??
        convertAmount(entry.amount, entry.currency, toCurrency, 1);
      withoutRate.push({ id: entry.id, currency: entry.currency });
    }
    total = safeNumber(total + amount);
  }

  return { total, withoutRate, hasFallback };
}
