import { FunctionArgumentType, FunctionPlugin } from 'hyperformula';
import type { InterpreterState } from 'hyperformula/typings/interpreter/InterpreterState';
import type { ProcedureAst } from 'hyperformula/typings/parser';

import { getCurrency } from '#shared/currencies';
import type { Currency } from '#shared/currencies';
import { getNumberFormat, integerToAmount } from '#shared/util';
import type { NumberFormats } from '#shared/util';

// User feedback: Make formatting functions respect app settings with locale-based fallbacks
// Global state to store user preferences for formatting functions
// This is set before formula execution to avoid async issues in HyperFormula custom functions
let cachedUserPreferences: {
  currency: Currency;
  numberFormat: NumberFormats;
  thousandsSeparator: string;
  decimalSeparator: string;
  locale: string;
} | null = null;

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

// Function to load and cache user preferences
// This should be called before formula execution (can be async)
export async function loadUserPreferencesForFormulas(): Promise<void> {
  try {
    // Dynamically import db only when needed (server-side only)
    // This prevents bundling server code into the browser
    const db = await import('#server/db');

    // Get currency code from preferences
    const currencyCodePref = await db.first<Pick<db.DbPreference, 'value'>>(
      'SELECT value FROM preferences WHERE id = ?',
      ['defaultCurrencyCode'],
    );
    const currencyCode = currencyCodePref?.value || null;

    // Get number format from preferences
    const numberFormatPref = await db.first<Pick<db.DbPreference, 'value'>>(
      'SELECT value FROM preferences WHERE id = ?',
      ['numberFormat'],
    );
    const numberFormatValue =
      (numberFormatPref?.value as NumberFormats) || null;

    // Get locale from preferences
    const localePref = await db.first<Pick<db.DbPreference, 'value'>>(
      'SELECT value FROM preferences WHERE id = ?',
      ['locale'],
    );
    const locale = localePref?.value || 'en-US';

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

    cachedUserPreferences = {
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
    cachedUserPreferences = {
      currency: getCurrency('USD'),
      numberFormat: 'comma-dot',
      thousandsSeparator: ',',
      decimalSeparator: '.',
      locale: 'en-US',
    };
  }
}

// Synchronous getter for cached preferences (used by custom functions)
function getUserPreferences() {
  if (!cachedUserPreferences) {
    // If not loaded, use defaults
    return {
      currency: getCurrency('USD'),
      numberFormat: 'comma-dot' as NumberFormats,
      thousandsSeparator: ',',
      decimalSeparator: '.',
      locale: 'en-US',
    };
  }
  return cachedUserPreferences;
}

export class CustomFunctionsPlugin extends FunctionPlugin {
  integerToAmount(ast: ProcedureAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('INTEGER_TO_AMOUNT'),
      (integerAmount: number, decimalPlaces: number = 2) => {
        return integerToAmount(integerAmount, decimalPlaces);
      },
    );
  }

  fixed(ast: ProcedureAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('FIXED'),
      (number: number, decimals: number = 0) => {
        return Number(number).toFixed(decimals);
      },
    );
  }

  balanceOf(ast: ProcedureAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('BALANCE_OF'),
      (accountKey: string) => {
        const ctx = this.config.context as
          | { balanceOfPrefetch?: Map<string, number> }
          | undefined;
        return ctx?.balanceOfPrefetch?.get(accountKey) ?? 0;
      },
    );
  }

  // Feedback: Users reported that TEXT() function doesn't properly format numbers with
  // thousands separators (e.g., TEXT(value, "$#,##0.00") doesn't work as expected).
  // This custom function provides proper number formatting with thousands separators.
  // User feedback: Should respect app's number format settings, with locale-based fallbacks
  formatNumber(ast: ProcedureAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('FORMATNUMBER'),
      (
        value: number,
        decimals?: number,
        thousandsSeparator?: string,
        decimalSeparator?: string,
      ) => {
        const num = Number(value);
        if (isNaN(num)) {
          return '#VALUE!';
        }

        // Get cached user preferences
        const prefs = getUserPreferences();

        // Priority: explicit parameter > app settings > locale defaults
        const actualThousandsSeparator =
          thousandsSeparator ?? prefs.thousandsSeparator;
        const actualDecimalSeparator =
          decimalSeparator ?? prefs.decimalSeparator;
        const actualDecimals = decimals ?? 2;

        const fixedNum = num.toFixed(actualDecimals);
        const [integerPart, decimalPart] = fixedNum.split('.');

        const formattedInteger = integerPart.replace(
          /\B(?=(\d{3})+(?!\d))/g,
          actualThousandsSeparator,
        );

        if (actualDecimals > 0 && decimalPart) {
          return `${formattedInteger}${actualDecimalSeparator}${decimalPart}`;
        }

        return formattedInteger;
      },
    );
  }

  // Feedback: Users need proper currency formatting for formula cards.
  // This function formats numbers as currency with symbol, thousands separators, and decimals.
  // User feedback: Should respect app's currency and number format settings, with locale-based fallbacks
  formatCurrency(ast: ProcedureAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('FORMATCURRENCY'),
      (
        value: number,
        currencySymbol?: string,
        decimals?: number,
        thousandsSeparator?: string,
        decimalSeparator?: string,
      ) => {
        const num = Number(value);
        if (isNaN(num)) {
          return '#VALUE!';
        }

        // Get cached user preferences
        const prefs = getUserPreferences();

        // Priority: explicit parameter > app settings > locale defaults
        const actualCurrencySymbol = currencySymbol ?? prefs.currency.symbol;
        const actualDecimals = decimals ?? prefs.currency.decimalPlaces;
        const actualThousandsSeparator =
          thousandsSeparator ?? prefs.thousandsSeparator;
        const actualDecimalSeparator =
          decimalSeparator ?? prefs.decimalSeparator;

        const isNegative = num < 0;
        const absNum = Math.abs(num);
        const fixedNum = absNum.toFixed(actualDecimals);
        const [integerPart, decimalPart] = fixedNum.split('.');

        const formattedInteger = integerPart.replace(
          /\B(?=(\d{3})+(?!\d))/g,
          actualThousandsSeparator,
        );

        let result =
          actualDecimals > 0 && decimalPart
            ? `${formattedInteger}${actualDecimalSeparator}${decimalPart}`
            : formattedInteger;

        result = `${actualCurrencySymbol}${result}`;

        if (isNegative) {
          result = `-${result}`;
        }

        return result;
      },
    );
  }
}

CustomFunctionsPlugin.implementedFunctions = {
  BALANCE_OF: {
    method: 'balanceOf',
    parameters: [{ argumentType: FunctionArgumentType.STRING }],
  },
  FIXED: {
    method: 'fixed',
    parameters: [
      { argumentType: FunctionArgumentType.NUMBER },
      {
        argumentType: FunctionArgumentType.NUMBER,
        optionalArg: true,
        defaultValue: 0,
      },
    ],
  },
  INTEGER_TO_AMOUNT: {
    method: 'integerToAmount',
    parameters: [
      { argumentType: FunctionArgumentType.NUMBER },
      {
        argumentType: FunctionArgumentType.NUMBER,
        optionalArg: true,
        defaultValue: 2,
      },
    ],
  },
  FORMATNUMBER: {
    method: 'formatNumber',
    parameters: [
      { argumentType: FunctionArgumentType.NUMBER },
      {
        argumentType: FunctionArgumentType.NUMBER,
        optionalArg: true,
        defaultValue: 2,
      },
      {
        argumentType: FunctionArgumentType.STRING,
        optionalArg: true,
        defaultValue: ',',
      },
      {
        argumentType: FunctionArgumentType.STRING,
        optionalArg: true,
        defaultValue: '.',
      },
    ],
  },
  FORMATCURRENCY: {
    method: 'formatCurrency',
    parameters: [
      { argumentType: FunctionArgumentType.NUMBER },
      {
        argumentType: FunctionArgumentType.STRING,
        optionalArg: true,
        defaultValue: '$',
      },
      {
        argumentType: FunctionArgumentType.NUMBER,
        optionalArg: true,
        defaultValue: 2,
      },
      {
        argumentType: FunctionArgumentType.STRING,
        optionalArg: true,
        defaultValue: ',',
      },
      {
        argumentType: FunctionArgumentType.STRING,
        optionalArg: true,
        defaultValue: '.',
      },
    ],
  },
};

export const customFunctionsTranslations = {
  enUS: {
    BALANCE_OF: 'BALANCE_OF',
    FIXED: 'FIXED',
    INTEGER_TO_AMOUNT: 'INTEGER_TO_AMOUNT',
    FORMATNUMBER: 'FORMATNUMBER',
    FORMATCURRENCY: 'FORMATCURRENCY',
  },
};
