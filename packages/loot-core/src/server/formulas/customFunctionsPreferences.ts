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

const DEFAULT_CURRENCY = getCurrency('USD');
const LOCALE_NUMBER_FORMAT_SAMPLE = 1_000_000.23;

function normalizeLocale(locale?: string | null): string | null {
  const normalized = locale?.trim();
  return normalized ? normalized : null;
}

function getLocaleDefaults(locale?: string): {
  thousandsSeparator: string;
  decimalSeparator: string;
} {
  const parts = new Intl.NumberFormat(locale || 'en-US').formatToParts(
    LOCALE_NUMBER_FORMAT_SAMPLE,
  );

  return {
    thousandsSeparator: parts.find(part => part.type === 'group')?.value ?? ',',
    decimalSeparator: parts.find(part => part.type === 'decimal')?.value ?? '.',
  };
}

function getNumberFormatFromLocale(locale: string): NumberFormats {
  const { thousandsSeparator, decimalSeparator } = getLocaleDefaults(locale);

  if (decimalSeparator === '.' && thousandsSeparator === ',') {
    return 'comma-dot';
  }

  if (decimalSeparator === ',' && thousandsSeparator === '.') {
    return 'dot-comma';
  }

  if (decimalSeparator === ',' && thousandsSeparator.trim() === '') {
    return 'space-comma';
  }

  if (
    decimalSeparator === '.' &&
    (thousandsSeparator === "'" || thousandsSeparator === '\u2019')
  ) {
    return 'apostrophe-dot';
  }

  return 'comma-dot';
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

    const currency = currencyFromPreference ?? DEFAULT_CURRENCY;

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
      : currencyFromPreference?.numberFormat ||
        getNumberFormatFromLocale(locale);

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
    const currency = DEFAULT_CURRENCY;
    const numberFormat = getNumberFormatFromLocale(locale);
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
