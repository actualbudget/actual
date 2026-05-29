import * as asyncStorage from '#platform/server/asyncStorage';
import { aqlQuery } from '#server/aql';
import { getCurrency } from '#shared/currencies';
import type { Currency } from '#shared/currencies';
import type { UserPreferences } from '#shared/formulas/customFunctions';
import { q } from '#shared/query';
import { getNumberFormat } from '#shared/util';
import type { NumberFormats } from '#shared/util';

type FormulaPreferencesOptions = {
  selectedLocale?: string;
  browserLocale?: string;
};

type CurrencySymbolPosition = 'before' | 'after';

function normalizeLocale(locale?: string | null): string | null {
  const normalized = locale?.trim();
  return normalized ? normalized : null;
}

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
    actualLocale.startsWith('it') ||
    actualLocale.startsWith('pt-BR')
  ) {
    // German, Spanish, Italian, Brazilian Portuguese: 1.000,00
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
  if (locale.startsWith('pt-BR')) {
    return getCurrency('BRL');
  } else if (locale.startsWith('en-GB')) {
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

function getCurrencyFromPreference(
  currencyCode: string | null,
): Currency | null {
  if (!currencyCode) {
    return null;
  }

  const currency = getCurrency(currencyCode);
  return currency.code ? currency : null;
}

function getCurrencySymbolPosition(
  value: string | null,
  currency: Currency,
): CurrencySymbolPosition {
  if (value === 'before' || value === 'after') {
    return value;
  }

  return currency.symbolFirst ? 'before' : 'after';
}

const DEFAULT_CURRENCY_SYMBOL_POSITION: CurrencySymbolPosition = 'before';

// Function to load user preferences from the database
// This should be called before formula execution
export async function loadUserPreferencesForFormulas({
  selectedLocale,
  browserLocale,
}: FormulaPreferencesOptions = {}): Promise<UserPreferences> {
  try {
    const isCurrencyFeatureEnabledPref = await aqlQuery(
      q('preferences').filter({ id: 'flags.currency' }).select('*'),
    );
    const isCurrencyFeatureEnabled =
      isCurrencyFeatureEnabledPref.data.length > 0 &&
      isCurrencyFeatureEnabledPref.data[0].value === 'true';

    const currencyPref = await aqlQuery(
      q('preferences').filter({ id: 'defaultCurrencyCode' }).select('*'),
    );
    const currencyCode =
      currencyPref.data.length > 0 ? currencyPref.data[0].value : null;
    const currencyFromPreference = isCurrencyFeatureEnabled
      ? getCurrencyFromPreference(currencyCode)
      : null;

    const numberFormatPref = await aqlQuery(
      q('preferences').filter({ id: 'numberFormat' }).select('*'),
    );
    const numberFormatValue =
      numberFormatPref.data.length > 0
        ? (numberFormatPref.data[0].value as NumberFormats)
        : null;

    const locale =
      normalizeLocale(selectedLocale) ??
      normalizeLocale(await asyncStorage.getItem('language')) ??
      normalizeLocale(browserLocale) ??
      'en-US';

    const currency = currencyFromPreference ?? getCurrencyFromLocale(locale);

    const symbolPositionPref = await aqlQuery(
      q('preferences').filter({ id: 'currencySymbolPosition' }).select('*'),
    );
    const symbolPositionValue =
      symbolPositionPref.data.length > 0
        ? symbolPositionPref.data[0].value
        : null;

    const spaceEnabledPref = await aqlQuery(
      q('preferences')
        .filter({ id: 'currencySpaceBetweenAmountAndSymbol' })
        .select('*'),
    );
    const spaceEnabledValue =
      spaceEnabledPref.data.length > 0 ? spaceEnabledPref.data[0].value : null;
    const shouldUseCurrencyPreferences = currencyFromPreference !== null;

    const numberFormat = numberFormatValue
      ? numberFormatValue
      : currency.numberFormat || getCurrencyFromLocale(locale).numberFormat;

    // Get number format settings
    const numberFormatSettings = getNumberFormat({
      format: numberFormat,
    });

    // Get locale-based defaults as fallback
    const localeDefaults = getLocaleDefaults(locale);

    return {
      currency,
      numberFormat,
      thousandsSeparator:
        numberFormatSettings.thousandsSeparator ||
        localeDefaults.thousandsSeparator,
      decimalSeparator:
        numberFormatSettings.decimalSeparator ||
        localeDefaults.decimalSeparator,
      locale,
      currencySymbolPosition: shouldUseCurrencyPreferences
        ? getCurrencySymbolPosition(symbolPositionValue, currency)
        : DEFAULT_CURRENCY_SYMBOL_POSITION,
      currencySpaceBetweenAmountAndSymbol: shouldUseCurrencyPreferences
        ? spaceEnabledValue === 'true'
        : false,
    };
  } catch {
    const locale =
      normalizeLocale(selectedLocale) ??
      normalizeLocale(browserLocale) ??
      'en-US';
    const currency = getCurrencyFromLocale(locale);
    const numberFormat = currency.numberFormat || 'comma-dot';
    const numberFormatSettings = getNumberFormat({
      format: numberFormat,
    });
    const localeDefaults = getLocaleDefaults(locale);

    return {
      currency,
      numberFormat,
      thousandsSeparator:
        numberFormatSettings.thousandsSeparator ||
        localeDefaults.thousandsSeparator,
      decimalSeparator:
        numberFormatSettings.decimalSeparator ||
        localeDefaults.decimalSeparator,
      locale,
      currencySymbolPosition: DEFAULT_CURRENCY_SYMBOL_POSITION,
      currencySpaceBetweenAmountAndSymbol: false,
    };
  }
}
