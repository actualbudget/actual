import { currencies } from '#shared/currencies';

export function isSupportedCurrencyCode(code: string): boolean {
  return code !== '' && currencies.some(currency => currency.code === code);
}

export function getEffectiveCurrency(
  accountCurrency: string | null | undefined,
  defaultCurrencyCode: string,
): string {
  return accountCurrency || defaultCurrencyCode;
}
