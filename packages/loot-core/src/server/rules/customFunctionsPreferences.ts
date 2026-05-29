import { aqlQuery } from '#server/aql';
import { getCurrency } from '#shared/currencies';
import type { Currency } from '#shared/currencies';
import { q } from '#shared/query';
import { getNumberFormat } from '#shared/util';
import type { NumberFormats } from '#shared/util';

// Helper to get locale-based number format defaults
function getLocaleDefaults(locale?: string): {
  thousandsSeparator: string;
  decimalSeparator: string;
} {
  // Default to en-US if no locale
  const actualLocale = locale || 'en-US';

  // Map common locales to their number formats
  if (
    actualLocale.startsWith('de') ||
    actualLocale.startsWith('es') ||
    actualLocale.startsWith('it')
  ) {
    // German, Spanish, Italian: 1.000,00
    return { thousandsSeparator: '.', decimalSeparator: ',' };
  } else if (
    actualLocale.startsWith('fr') ||
    actualLocale.startsWith('ru') ||
    actualLocale.startsWith('cs')
  ) {
    // French, Russian, Czech: 1 000,00
    return { thousandsSeparator: '\u202F', decimalSeparator: ',' };
  } else if (actualLocale.startsWith('de-CH')) {
    // Swiss German: 1'000.00
    return { thousandsSeparator: '\u2019', decimalSeparator: '.' };
  } else if (
    actualLocale.startsWith('en-IN') ||
    actualLocale.startsWith('hi')
  ) {
    // Indian: 1,00,000.00 (but we'll use standard comma for simplicity)
    return { thousandsSeparator: ',', decimalSeparator: '.' };
  } else {
    // Default (en-US, en-GB, etc.): 1,000.00
    return { thousandsSeparator: ',', decimalSeparator: '.' };
  }
}

// Helper to determine currency from locale
function getCurrencyFromLocale(locale: string): Currency {
  if (locale.startsWith('en-GB')) {
    return getCurrency('GBP');
  } else if (
    locale.startsWith('de') ||
    locale.startsWith('fr') ||
    locale.startsWith('es') ||
    locale.startsWith('it') ||
    locale.startsWith('nl')
  ) {
    return getCurrency('EUR');
  } else if (locale.startsWith('ja')) {
    return getCurrency('JPY');
  } else if (locale.startsWith('en-IN') || locale.startsWith('hi')) {
    return getCurrency('INR');
  } else if (locale.startsWith('en-CA')) {
    return getCurrency('CAD');
  } else if (locale.startsWith('en-AU')) {
    return getCurrency('AUD');
  } else {
    return getCurrency('USD');
  }
}

export type UserPreferences = {
  currency: Currency;
  numberFormat: NumberFormats;
  thousandsSeparator: string;
  decimalSeparator: string;
  locale: string;
};

// Function to load user preferences from the database
// This should be called before formula execution
export async function loadUserPreferencesForFormulas(): Promise<UserPreferences> {
  try {
    const currencyPref = await aqlQuery(
      q('preferences').filter({ id: 'defaultCurrencyCode' }).select('*'),
    );
    const currencyCode =
      currencyPref.data.length > 0 ? currencyPref.data[0].value : null;

    const numberFormatPref = await aqlQuery(
      q('preferences').filter({ id: 'numberFormat' }).select('*'),
    );
    const numberFormatValue =
      numberFormatPref.data.length > 0
        ? (numberFormatPref.data[0].value as NumberFormats)
        : null;

    const localePref = await aqlQuery(
      q('preferences').filter({ id: 'locale' }).select('*'),
    );
    const locale =
      localePref.data.length > 0 ? localePref.data[0].value : 'en-US';

    // Determine currency
    const currency = currencyCode
      ? getCurrency(currencyCode)
      : getCurrencyFromLocale(locale);

    // Get number format settings
    const numberFormatSettings = getNumberFormat({
      format: numberFormatValue || undefined,
    });

    // Get locale-based defaults as fallback
    const localeDefaults = getLocaleDefaults(locale);

    return {
      currency,
      numberFormat: numberFormatValue || 'comma-dot',
      thousandsSeparator:
        numberFormatSettings.thousandsSeparator ||
        localeDefaults.thousandsSeparator,
      decimalSeparator:
        numberFormatSettings.decimalSeparator ||
        localeDefaults.decimalSeparator,
      locale,
    };
  } catch {
    // Fallback to defaults if preferences can't be loaded
    return {
      currency: getCurrency('USD'),
      numberFormat: 'comma-dot',
      thousandsSeparator: ',',
      decimalSeparator: '.',
      locale: 'en-US',
    };
  }
}
