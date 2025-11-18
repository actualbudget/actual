import { NumberFormats } from './util';

export type Currency = {
  code: string;
  symbol: string;
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
  { code: '', name: 'None', symbol: '', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: false },
  { code: 'ARS', name: 'Argentinian Peso', symbol: 'Arg$', decimalPlaces: 2, numberFormat: 'dot-comma', symbolFirst: true },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimalPlaces: 2, numberFormat: 'dot-comma', symbolFirst: true },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr.', decimalPlaces: 2, numberFormat: 'apostrophe-dot', symbolFirst: true },
  { code: 'CNY', name: 'Yuan Renminbi', symbol: '¥', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'COP', name: 'Colombian Peso', symbol: 'Col$', decimalPlaces: 2, numberFormat: 'dot-comma', symbolFirst: true },
  { code: 'CRC', name: 'Costa Rican Colón', symbol: '₡', decimalPlaces: 2, numberFormat: 'space-comma', symbolFirst: true },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', decimalPlaces: 2, numberFormat: 'dot-comma', symbolFirst: false },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: false },
  { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2, numberFormat: 'dot-comma', symbolFirst: false },
  { code: 'GBP', name: 'Pound Sterling', symbol: '£', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'GTQ', name: 'Guatemalan Quetzal', symbol: 'Q', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimalPlaces: 2, numberFormat: 'dot-comma', symbolFirst: true },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimalPlaces: 2, numberFormat: 'comma-dot-in', symbolFirst: true },
  { code: 'JMD', name: 'Jamaican Dollar', symbol: 'J$', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs.', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'MDL', name: 'Moldovan Leu', symbol: 'L', decimalPlaces: 2, numberFormat: 'dot-comma', symbolFirst: false },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', decimalPlaces: 2, numberFormat: 'space-comma', symbolFirst: false },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: false },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', decimalPlaces: 2, numberFormat: 'dot-comma', symbolFirst: false },
  { code: 'RSD', name: 'Serbian Dinar', symbol: 'дин', decimalPlaces: 2, numberFormat: 'dot-comma', symbolFirst: false },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', decimalPlaces: 2, numberFormat: 'space-comma', symbolFirst: false },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: false },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimalPlaces: 2, numberFormat: 'space-comma', symbolFirst: false },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', decimalPlaces: 2, numberFormat: 'dot-comma', symbolFirst: true },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', decimalPlaces: 2, numberFormat: 'space-comma', symbolFirst: false },
  { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  { code: 'UZS', name: 'Uzbek Soum', symbol: 'UZS', decimalPlaces: 2, numberFormat: 'space-comma', symbolFirst: false },
];

export function getCurrency(code: string): Currency {
  return currencies.find(c => c.code === code) || currencies[0];
}
