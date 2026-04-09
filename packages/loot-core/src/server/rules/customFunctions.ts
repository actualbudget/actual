import { FunctionArgumentType, FunctionPlugin } from 'hyperformula';
import type { InterpreterState } from 'hyperformula/typings/interpreter/InterpreterState';
import type { ProcedureAst } from 'hyperformula/typings/parser';

import { integerToAmount } from '#shared/util';

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
  formatNumber(ast: ProcedureAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('FORMATNUMBER'),
      (
        value: number,
        decimals: number = 2,
        thousandsSeparator: string = ',',
        decimalSeparator: string = '.',
      ) => {
        const num = Number(value);
        if (isNaN(num)) {
          return '#VALUE!';
        }

        const fixedNum = num.toFixed(decimals);
        const [integerPart, decimalPart] = fixedNum.split('.');

        const formattedInteger = integerPart.replace(
          /\B(?=(\d{3})+(?!\d))/g,
          thousandsSeparator,
        );

        if (decimals > 0 && decimalPart) {
          return `${formattedInteger}${decimalSeparator}${decimalPart}`;
        }

        return formattedInteger;
      },
    );
  }

  // Feedback: Users need proper currency formatting for formula cards.
  // This function formats numbers as currency with symbol, thousands separators, and decimals.
  formatCurrency(ast: ProcedureAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('FORMATCURRENCY'),
      (
        value: number,
        currencySymbol: string = '$',
        decimals: number = 2,
        thousandsSeparator: string = ',',
        decimalSeparator: string = '.',
      ) => {
        const num = Number(value);
        if (isNaN(num)) {
          return '#VALUE!';
        }

        const isNegative = num < 0;
        const absNum = Math.abs(num);
        const fixedNum = absNum.toFixed(decimals);
        const [integerPart, decimalPart] = fixedNum.split('.');

        const formattedInteger = integerPart.replace(
          /\B(?=(\d{3})+(?!\d))/g,
          thousandsSeparator,
        );

        let result =
          decimals > 0 && decimalPart
            ? `${formattedInteger}${decimalSeparator}${decimalPart}`
            : formattedInteger;

        result = `${currencySymbol}${result}`;

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
