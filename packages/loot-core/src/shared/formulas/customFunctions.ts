import { FunctionArgumentType, FunctionPlugin } from 'hyperformula';
import type { InterpreterState } from 'hyperformula/typings/interpreter/InterpreterState';
import type { ProcedureAst } from 'hyperformula/typings/parser';

import { getCurrency } from '#shared/currencies';
import type { Currency } from '#shared/currencies';
import { integerToAmount } from '#shared/util';
import type { NumberFormats } from '#shared/util';

type CurrencySymbolPosition = 'before' | 'after';

export type UserPreferences = {
  currency: Currency;
  numberFormat: NumberFormats;
  thousandsSeparator: string;
  decimalSeparator: string;
  locale: string;
  currencySymbolPosition: CurrencySymbolPosition;
  currencySpaceBetweenAmountAndSymbol: boolean;
};

let cachedUserPreferences: UserPreferences | null = null;

export function setCachedUserPreferences(prefs: UserPreferences): void {
  cachedUserPreferences = prefs;
}

export function clearCachedUserPreferences(): void {
  cachedUserPreferences = null;
}

function getUserPreferences(): UserPreferences {
  if (!cachedUserPreferences) {
    // If not loaded, use defaults
    return {
      currency: getCurrency('USD'),
      numberFormat: 'comma-dot',
      thousandsSeparator: ',',
      decimalSeparator: '.',
      locale: 'en-US',
      currencySymbolPosition: 'before',
      currencySpaceBetweenAmountAndSymbol: false,
    };
  }
  return cachedUserPreferences;
}

function formatCurrencyValue({
  value,
  currencySymbol,
  decimals,
  thousandsSeparator,
  decimalSeparator,
  currencySymbolPosition,
  currencySpaceBetweenAmountAndSymbol,
}: {
  value: number;
  currencySymbol: string;
  decimals: number;
  thousandsSeparator: string;
  decimalSeparator: string;
  currencySymbolPosition: CurrencySymbolPosition;
  currencySpaceBetweenAmountAndSymbol: boolean;
}): string {
  const isNegative = value < 0;
  const absNum = Math.abs(value);
  const fixedNum = absNum.toFixed(decimals);
  const [integerPart, decimalPart] = fixedNum.split('.');

  const formattedInteger = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    thousandsSeparator,
  );

  const formattedAmount =
    decimals > 0 && decimalPart
      ? `${formattedInteger}${decimalSeparator}${decimalPart}`
      : formattedInteger;

  const space = currencySpaceBetweenAmountAndSymbol ? '\u202F' : '';
  const formattedCurrency =
    currencySymbolPosition === 'after'
      ? `${formattedAmount}${space}${currencySymbol}`
      : `${currencySymbol}${space}${formattedAmount}`;

  return isNegative ? `-${formattedCurrency}` : formattedCurrency;
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
    const hasThousandsSeparatorArg = ast.args.length > 2;
    const hasDecimalSeparatorArg = ast.args.length > 3;

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

        const prefs = getUserPreferences();

        const actualThousandsSeparator =
          hasThousandsSeparatorArg && thousandsSeparator !== undefined
            ? thousandsSeparator
            : prefs.thousandsSeparator;
        const actualDecimalSeparator =
          hasDecimalSeparatorArg && decimalSeparator !== undefined
            ? decimalSeparator
            : prefs.decimalSeparator;
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
    const hasCurrencySymbolArg = ast.args.length > 1;
    const hasDecimalsArg = ast.args.length > 2;
    const hasThousandsSeparatorArg = ast.args.length > 3;
    const hasDecimalSeparatorArg = ast.args.length > 4;

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

        const prefs = getUserPreferences();

        const actualCurrencySymbol = hasCurrencySymbolArg
          ? (currencySymbol ?? '')
          : prefs.currency.symbol;
        const actualDecimals = hasDecimalsArg
          ? (decimals ?? 2)
          : prefs.currency.decimalPlaces;
        const actualThousandsSeparator =
          hasThousandsSeparatorArg && thousandsSeparator !== undefined
            ? thousandsSeparator
            : prefs.thousandsSeparator;
        const actualDecimalSeparator =
          hasDecimalSeparatorArg && decimalSeparator !== undefined
            ? decimalSeparator
            : prefs.decimalSeparator;
        const actualCurrencySymbolPosition = hasCurrencySymbolArg
          ? 'before'
          : prefs.currencySymbolPosition;
        const actualCurrencySpaceBetweenAmountAndSymbol = hasCurrencySymbolArg
          ? false
          : prefs.currencySpaceBetweenAmountAndSymbol;

        return formatCurrencyValue({
          value: num,
          currencySymbol: actualCurrencySymbol,
          decimals: actualDecimals,
          thousandsSeparator: actualThousandsSeparator,
          decimalSeparator: actualDecimalSeparator,
          currencySymbolPosition: actualCurrencySymbolPosition,
          currencySpaceBetweenAmountAndSymbol:
            actualCurrencySpaceBetweenAmountAndSymbol,
        });
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
