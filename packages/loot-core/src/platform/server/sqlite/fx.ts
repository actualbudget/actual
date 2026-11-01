import { convertSqlAmount } from '#shared/fx/sql';

// FX_CONVERT(amount, currency, date): the amount in the budget's default
// currency, using the rate the user's rate setting picks
export function fxConvert(amount: unknown, currency: unknown, date: unknown) {
  return convertSqlAmount(amount, currency, date, false);
}

// FX_CONVERT_ON_DATE(amount, currency, date): always uses the rate on or
// before `date`, so past values don't change when a new rate is added
export function fxConvertOnDate(
  amount: unknown,
  currency: unknown,
  date: unknown,
) {
  return convertSqlAmount(amount, currency, date, true);
}
