import { getCurrency } from '#shared/currencies';

const localSymbols = new Map<string, string>();

// The symbol a currency is written with in its own country, e.g. "$" for
// both CAD and USD
export function getLocalCurrencySymbol(code: string): string {
  const cached = localSymbols.get(code);
  if (cached !== undefined) {
    return cached;
  }

  let symbol = getCurrency(code).symbol;
  try {
    const narrow = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    })
      .formatToParts(0)
      .find(part => part.type === 'currency')?.value;
    // Only drop a country prefix from the listed symbol ("CA$" -> "$",
    // "Col$" -> "$"); other listed symbols are kept as they are
    if (narrow && narrow !== code && symbol.endsWith(narrow)) {
      symbol = narrow;
    }
  } catch {
    // Not a code Intl knows; keep the symbol from the currency list
  }

  localSymbols.set(code, symbol);
  return symbol;
}

// How amounts in the budget's own currency are marked: not at all, with
// the local symbol ("$") or with code and symbol ("CAD$")
export type DefaultCurrencySymbol = 'none' | 'symbol' | 'code';

export function parseDefaultCurrencySymbol(
  value: string | undefined,
): DefaultCurrencySymbol {
  return value === 'symbol' || value === 'code' ? value : 'none';
}

// Other currencies always get their code in front of their symbol so that
// e.g. CAD and USD amounts can't be confused: "1,250.00" next to
// "USD$760.03"
export function getCurrencyDisplaySymbol(
  code: string,
  {
    defaultCurrencyCode,
    defaultSymbol = 'none',
  }: { defaultCurrencyCode: string; defaultSymbol?: DefaultCurrencySymbol },
): string {
  const local = getLocalCurrencySymbol(code);
  if (code === defaultCurrencyCode && defaultSymbol !== 'code') {
    return defaultSymbol === 'symbol' ? local : '';
  }
  // Symbols that are already letters ("kr", "CHF", "lei") would read
  // poorly after the code, so the code alone is used
  if (local === '' || /^[\p{L}.]+$/u.test(local)) {
    return code;
  }
  return `${code}${local}`;
}
