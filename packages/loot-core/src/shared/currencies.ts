import { NumberFormats } from './util';

export type Currency = {
  code: string;
  symbols: string[];
  defaultSymbolIndex: number;
  name: string;
  decimalPlaces: number;
  numberFormat: NumberFormats;
  symbolFirst: boolean;
};

// When adding a new currency with a higher decimal precision, make sure to update
// the MAX_SAFE_NUMBER in util.ts.
// When adding a currency, also update the translation map in
// packages/desktop-client/src/components/settings/Currency.tsx for the translation.
// Number formats and symbol placement based on CLDR (Common Locale Data Repository) /
// LDML (Locale Data Markup Language) locale conventions and Intl.NumberFormat standards
// References:
// https://www.localeplanet.com/icu/decimal-symbols.html
// https://www.localeplanet.com/api/auto/currencymap.html
// prettier-ignore
export const currencies: Currency[] = [
  { code: '', name: 'None', symbols: [''], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'AED', name: 'UAE Dirham', symbols: ['د.إ'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: false },
  { code: 'ARS', name: 'Argentinian Peso', symbols: ['Arg$'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'dot-comma', symbolFirst: true },
  { code: 'AUD', name: 'Australian Dollar', symbols: ['A$'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'BRL', name: 'Brazilian Real', symbols: ['R$'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'dot-comma', symbolFirst: true },
  { code: 'CAD', name: 'Canadian Dollar', symbols: ['CA$'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'CHF', name: 'Swiss Franc', symbols: ['Fr.'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'apostrophe-dot', symbolFirst: true },
  { code: 'CNY', name: 'Yuan Renminbi', symbols: ['¥'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'CRC', name: 'Costa Rican Colón', symbols: ['₡'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'space-comma', symbolFirst: true },
  { code: 'EGP', name: 'Egyptian Pound', symbols: ['ج.م'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: false },
  { code: 'EUR', name: 'Euro', symbols: ['€'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'dot-comma', symbolFirst: false },
  { code: 'GBP', name: 'Pound Sterling', symbols: ['£'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'HKD', name: 'Hong Kong Dollar', symbols: ['HK$'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'INR', name: 'Indian Rupee', symbols: ['₹'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'comma-dot-in', symbolFirst: true },
  { code: 'JMD', name: 'Jamaican Dollar', symbols: ['J$'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  // { code: 'JPY', name: 'Japanese Yen', symbols: ['¥'], defaultSymbolIndex: 0, decimalPlaces: 0, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbols: ['د.ك', 'KD'], defaultSymbolIndex: 0, decimalPlaces: 3, numberFormat: 'comma-dot', symbolFirst: false },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbols: ['Rs.'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'MDL', name: 'Moldovan Leu', symbols: ['L'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'dot-comma', symbolFirst: false },
  { code: 'PHP', name: 'Philippine Peso', symbols: ['₱'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'PLN', name: 'Polish Złoty', symbols: ['zł'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'space-comma', symbolFirst: false },
  { code: 'QAR', name: 'Qatari Riyal', symbols: ['ر.ق'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: false },
  { code: 'RON', name: 'Romanian Leu', symbols: ['lei'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'dot-comma', symbolFirst: false },
  { code: 'RSD', name: 'Serbian Dinar', symbols: ['дин'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'dot-comma', symbolFirst: false },
  { code: 'RUB', name: 'Russian Ruble', symbols: ['₽'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'space-comma', symbolFirst: false },
  { code: 'SAR', name: 'Saudi Riyal', symbols: ['ر.س'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: false },
  { code: 'SEK', name: 'Swedish Krona', symbols: ['kr'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'space-comma', symbolFirst: false },
  { code: 'SGD', name: 'Singapore Dollar', symbols: ['S$'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'THB', name: 'Thai Baht', symbols: ['฿'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'TRY', name: 'Turkish Lira', symbols: ['₺'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'dot-comma', symbolFirst: true },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbols: ['₴'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'space-comma', symbolFirst: false },
  { code: 'USD', name: 'US Dollar', symbols: ['$'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'UZS', name: 'Uzbek Soum', symbols: ['UZS'], defaultSymbolIndex: 0, decimalPlaces: 2, numberFormat: 'space-comma', symbolFirst: false },
];

export function getCurrency(code: string): Currency {
  return currencies.find(c => c.code === code) || currencies[0];
}

export function getCurrencySymbol(
  currency: Currency,
  symbolVariantIndex?: number,
): string {
  const index = symbolVariantIndex ?? currency.defaultSymbolIndex;
  return (
    currency.symbols[index] ?? currency.symbols[currency.defaultSymbolIndex]
  );
}
