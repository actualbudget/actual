import { FunctionArgumentType, FunctionPlugin } from 'hyperformula';
import type { InterpreterState } from 'hyperformula/typings/interpreter/InterpreterState';
import type { ProcedureAst } from 'hyperformula/typings/parser';

import { getCurrency } from '#shared/currencies';
import { integerToAmount } from '#shared/util';

import type { UserPreferences } from './customFunctionsPreferences';

// Global state to store user preferences for formatting functions
// This is set before formula execution to avoid async issues in HyperFormula custom functions
let cachedUserPreferences: UserPreferences | null = null;

// Setter for cached preferences (called from server-side code only)
export function setCachedUserPreferences(prefs: UserPreferences): void {
  cachedUserPreferences = prefs;
}

// Synchronous getter for cached preferences (used by custom functions)
function getUserPreferences(): UserPreferences {
  if (!cachedUserPreferences) {
    // If not loaded, use defaults
    return {
      currency: getCurrency('USD'),
      numberFormat: 'comma-dot',
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
