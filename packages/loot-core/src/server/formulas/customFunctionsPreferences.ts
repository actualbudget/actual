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
type FormulaPreferenceId =
  | 'flags.currency'
  | 'defaultCurrencyCode'
  | 'numberFormat'
  | 'hideFraction'
  | 'currencySymbolPosition'
  | 'currencySpaceBetweenAmountAndSymbol';

const FORMULA_PREFERENCE_IDS: FormulaPreferenceId[] = [
  'flags.currency',
  'defaultCurrencyCode',
  'numberFormat',
  'hideFraction',
  'currencySymbolPosition',
  'currencySpaceBetweenAmountAndSymbol',
];

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
    const preferencesQuery = await aqlQuery(
      q('preferences')
        .filter({ id: { $oneof: FORMULA_PREFERENCE_IDS } })
        .select('*'),
    );

    const preferences: Partial<Record<FormulaPreferenceId, string | null>> = {};
    for (const preference of preferencesQuery.data) {
      preferences[preference.id as FormulaPreferenceId] = preference.value;
    }

    const isCurrencyFeatureEnabled = preferences['flags.currency'] === 'true';
    const currencyCode = preferences.defaultCurrencyCode ?? null;
    const currencyFromPreference = isCurrencyFeatureEnabled
      ? getCurrencyFromPreference(currencyCode)
      : null;

    const numberFormatValue =
      (preferences.numberFormat as NumberFormats | undefined) ?? null;
    const hideFraction = preferences.hideFraction === 'true';

    const locale =
      normalizeLocale(selectedLocale) ??
      normalizeLocale(await asyncStorage.getItem('language')) ??
      normalizeLocale(browserLocale) ??
      'en-US';

    const currency = currencyFromPreference ?? DEFAULT_CURRENCY;
    const symbolPositionValue = preferences.currencySymbolPosition ?? null;
    const spaceEnabledValue =
      preferences.currencySpaceBetweenAmountAndSymbol ?? null;
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
      decimalPlaces: hideFraction ? 0 : currency.decimalPlaces,
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
      decimalPlaces: 2,
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
