import {
  currencyToAmount,
  getNumberFormat,
} from '@actual-app/core/shared/util';

// The rates the server accepts: others are almost certainly a mistake
export const MIN_RATE = 1e-9;
export const MAX_RATE = 1e9;

// Rates are typed and shown with the user's number format, like amounts:
// "1,4137" is a rate of 1.4137 where a comma separates decimals and "3,000"
// is 3000 where it separates thousands
export function parseRate(value: string): number | null {
  const rate = currencyToAmount(value.trim());
  return rate !== null &&
    Number.isFinite(rate) &&
    rate >= MIN_RATE &&
    rate <= MAX_RATE
    ? rate
    : null;
}

// Without thousands separators, so a rate reads back the same in every
// format, and without exponents for very small rates
export function formatRate(rate: number, significantDigits = 10) {
  return new Intl.NumberFormat('en-US', {
    maximumSignificantDigits: significantDigits,
    useGrouping: false,
  })
    .format(rate)
    .replace('.', getNumberFormat().decimalSeparator);
}
