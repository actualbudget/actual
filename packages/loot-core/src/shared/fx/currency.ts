import { currencies, getDecimalPlaces } from '#shared/currencies';

export function isSupportedCurrencyCode(code: string): boolean {
  return code !== '' && currencies.some(currency => currency.code === code);
}

// Multiple currencies only support currencies with two decimal places for
// now: amounts of every account are then stored at the same scale, so
// older app versions, rules, reconciliation and totals can't mix them up
export function canUseInMultiCurrency(code: string): boolean {
  return isSupportedCurrencyCode(code) && getDecimalPlaces(code) === 2;
}

export function getEffectiveCurrency(
  accountCurrency: string | null | undefined,
  defaultCurrencyCode: string,
): string {
  return accountCurrency || defaultCurrencyCode;
}

// Amounts of accounts with their own currency are stored with the decimal
// places of that currency. Accounts without one keep the two decimal places
// amounts have always been stored with, whatever the default currency.
export function getStoredDecimalPlaces(
  accountCurrency: string | null | undefined,
): number {
  return accountCurrency ? getDecimalPlaces(accountCurrency) : 2;
}
