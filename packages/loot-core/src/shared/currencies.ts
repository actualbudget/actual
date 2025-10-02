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
// Number formats and symbol placement based on CLDR/LDML locale conventions and
// Intl.NumberFormat standards
// prettier-ignore
export const currencies: Currency[] = [
  { code: '', name: 'None', symbol: '', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  // United Arab Emirates (ar-AE): Uses comma for thousands, dot for decimals, symbol before amount
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  // Australia (en-AU): Uses comma for thousands, dot for decimals, symbol before amount
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  // Brazil (pt-BR): Uses dot for thousands, comma for decimals, symbol before amount
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimalPlaces: 2, numberFormat: 'dot-comma', symbolFirst: true },
  // Canada (en-CA, fr-CA): Uses comma for thousands, dot for decimals, symbol before amount
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  // Switzerland (de-CH, fr-CH): Uses apostrophe/space for thousands, dot for decimals, symbol before amount
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr.', decimalPlaces: 2, numberFormat: 'apostrophe-dot', symbolFirst: true },
  // China (zh-CN): Uses comma for thousands, dot for decimals, symbol before amount
  { code: 'CNY', name: 'Yuan Renminbi', symbol: '¥', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  // Egypt (ar-EG): Uses comma for thousands, dot for decimals, symbol before amount in English contexts
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  // Eurozone: Varies by locale - Germany uses dot-comma, France uses space-comma, symbol after amount
  { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2, numberFormat: 'dot-comma', symbolFirst: false },
  // United Kingdom (en-GB): Uses comma for thousands, dot for decimals, symbol before amount
  { code: 'GBP', name: 'Pound Sterling', symbol: '£', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  // Hong Kong (en-HK, zh-HK): Uses comma for thousands, dot for decimals, symbol before amount
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  // India (en-IN): Uses Indian numbering system with lakh/crore grouping, symbol before amount
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimalPlaces: 2, numberFormat: 'comma-dot-in', symbolFirst: true },
  // Jamaica (en-JM): Uses comma for thousands, dot for decimals, symbol before amount
  { code: 'JMD', name: 'Jamaican Dollar', symbol: 'J$', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  // Japan (ja-JP): Uses comma for thousands, no decimals typically, symbol before amount
  // { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0, numberFormat: 'comma-dot', symbolFirst: true }, // Keep commented until amounts with decimal places other than 2 are supported
  // Moldova (ro-MD): Uses dot for thousands, comma for decimals, symbol after amount
  { code: 'MDL', name: 'Moldovan Leu', symbol: 'L', decimalPlaces: 2, numberFormat: 'dot-comma', symbolFirst: false },
  // Philippines (en-PH): Uses comma for thousands, dot for decimals, symbol before amount
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  // Poland (pl-PL): Uses space for thousands, comma for decimals, symbol after amount
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', decimalPlaces: 2, numberFormat: 'space-comma', symbolFirst: false },
  // Qatar (ar-QA): Uses comma for thousands, dot for decimals, symbol before amount in English contexts
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  // Romania (ro-RO): Uses dot for thousands, comma for decimals, symbol after amount
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', decimalPlaces: 2, numberFormat: 'dot-comma', symbolFirst: false },
  // Serbia (sr-RS): Uses dot for thousands, comma for decimals, symbol after amount
  { code: 'RSD', name: 'Serbian Dinar', symbol: 'дин', decimalPlaces: 2, numberFormat: 'dot-comma', symbolFirst: false },
  // Russia (ru-RU): Uses space for thousands, comma for decimals, symbol after amount
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', decimalPlaces: 2, numberFormat: 'space-comma', symbolFirst: false },
  // Saudi Arabia (ar-SA): Uses comma for thousands, dot for decimals, symbol before amount in English contexts
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  // Sweden (sv-SE): Uses space for thousands, comma for decimals, symbol after amount
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimalPlaces: 2, numberFormat: 'space-comma', symbolFirst: false },
  // Singapore (en-SG): Uses comma for thousands, dot for decimals, symbol before amount
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  // Thailand (th-TH): Uses comma for thousands, dot for decimals, symbol before amount
  { code: 'THB', name: 'Thai Baht', symbol: '฿', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
  // Turkey (tr-TR): Uses dot for thousands, comma for decimals, symbol before amount
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', decimalPlaces: 2, numberFormat: 'dot-comma', symbolFirst: true },
  // Ukraine (uk-UA): Uses space for thousands, comma for decimals, symbol after amount
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', decimalPlaces: 2, numberFormat: 'space-comma', symbolFirst: false },
  // United States (en-US): Uses comma for thousands, dot for decimals, symbol before amount
  { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, numberFormat: 'comma-dot', symbolFirst: true },
];

export function getCurrency(code: string): Currency {
  return currencies.find(c => c.code === code) || currencies[0];
}
