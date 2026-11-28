import {
  MAX_EXCHANGE_RATE,
  MIN_EXCHANGE_RATE,
} from '@actual-app/core/shared/fx/rates';
import {
  currencyToAmount,
  getNumberFormat,
} from '@actual-app/core/shared/util';

// Rates are typed and shown with the user's number format, like amounts:
// "1,4137" is a rate of 1.4137 where a comma separates decimals and "3,000"
// is 3000 where it separates thousands
export function parseRate(value: string): number | null {
  const rate = currencyToAmount(value.trim());
  return rate !== null &&
    Number.isFinite(rate) &&
    rate >= MIN_EXCHANGE_RATE &&
    rate <= MAX_EXCHANGE_RATE
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

// A rate between two currencies as "1 USD = 1.4129 CAD": how many units of
// `to` one unit of `from` is worth, or the other way round when `inverted`,
// so pairs like CAD and COP can show the currency worth more on the left
export function formatPairRate(
  rate: number,
  from: string,
  to: string,
  inverted = rate < 1,
) {
  const value = inverted ? 1 / rate : rate;
  const text = formatRate(value, 6);
  return inverted ? `1 ${to} = ${text} ${from}` : `1 ${from} = ${text} ${to}`;
}
