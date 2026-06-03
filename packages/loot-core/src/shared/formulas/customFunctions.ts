import {
  ArraySize,
  CellError,
  EmptyValue,
  ErrorType,
  FunctionArgumentType,
  FunctionPlugin,
  SimpleRangeValue,
} from 'hyperformula';
import type { InterpreterState } from 'hyperformula/typings/interpreter/InterpreterState';
import type { ProcedureAst } from 'hyperformula/typings/parser';

import { getCurrency } from '#shared/currencies';
import type { Currency } from '#shared/currencies';
import { integerToAmount } from '#shared/util';
import type { NumberFormats } from '#shared/util';

type CurrencySymbolPosition = 'before' | 'after';

export type BudgetQueryRequest = {
  dimension: string;
  categoryIds: string[];
  startMonth: string;
  endMonth: string;
};

export type FormulaQueryContext = {
  queryNames?: Set<string>;
  queryCountNames?: Set<string>;
  queryExtractCategoryNames?: Set<string>;
  queryExtractTimeframeStartNames?: Set<string>;
  queryExtractTimeframeEndNames?: Set<string>;
  budgetQueryRequests?: Map<string, BudgetQueryRequest>;
  querySumPrefetch?: Map<string, number>;
  queryCountPrefetch?: Map<string, number>;
  queryExtractCategoriesPrefetch?: Map<string, string[]>;
  queryExtractTimeframeStartPrefetch?: Map<string, string>;
  queryExtractTimeframeEndPrefetch?: Map<string, string>;
  budgetQueryPrefetch?: Map<string, number>;
  budgetQueryErrors?: Map<string, string>;
};

type CustomFunctionsContext = {
  balanceOfPrefetch?: Map<string, number>;
  formulaQuery?: FormulaQueryContext;
};

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

export function createBudgetQueryPrefetchKey({
  dimension,
  categoryIds,
  startMonth,
  endMonth,
}: BudgetQueryRequest): string {
  return JSON.stringify({
    dimension: dimension.toLowerCase(),
    categoryIds,
    startMonth,
    endMonth,
  });
}

function categoryRangeToIds(categories: SimpleRangeValue): string[] {
  return categories
    .valuesFromTopLeftCorner()
    .filter(
      value =>
        value !== EmptyValue &&
        !(value instanceof CellError) &&
        (typeof value === 'string' || typeof value === 'number'),
    )
    .map(value => String(value).trim())
    .filter(value => value.length > 0);
}

function categoryIdsToRange(categoryIds: string[]): SimpleRangeValue {
  return SimpleRangeValue.onlyValues(
    categoryIds.length > 0
      ? categoryIds.map(categoryId => [categoryId])
      : [['']],
  );
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
  private getCustomFunctionsContext(): CustomFunctionsContext | undefined {
    return this.config.context as CustomFunctionsContext | undefined;
  }

  private getFormulaQueryContext(): FormulaQueryContext | undefined {
    return this.getCustomFunctionsContext()?.formulaQuery;
  }

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
        const ctx = this.getCustomFunctionsContext();
        return ctx?.balanceOfPrefetch?.get(accountKey) ?? 0;
      },
    );
  }

  query(ast: ProcedureAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('QUERY'),
      (queryName: string) => {
        const ctx = this.getFormulaQueryContext();
        ctx?.queryNames?.add(queryName);
        return ctx?.querySumPrefetch?.get(queryName) ?? 0;
      },
    );
  }

  queryCount(ast: ProcedureAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('QUERY_COUNT'),
      (queryName: string) => {
        const ctx = this.getFormulaQueryContext();
        ctx?.queryCountNames?.add(queryName);
        return ctx?.queryCountPrefetch?.get(queryName) ?? 0;
      },
    );
  }

  queryExtractCategories(ast: ProcedureAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('QUERY_EXTRACT_CATEGORIES'),
      (queryName: string) => {
        const ctx = this.getFormulaQueryContext();
        ctx?.queryExtractCategoryNames?.add(queryName);
        return categoryIdsToRange(
          ctx?.queryExtractCategoriesPrefetch?.get(queryName) ?? [],
        );
      },
    );
  }

  queryExtractCategoriesSize(ast: ProcedureAst): ArraySize {
    if (ast.args.length !== 1) {
      return ArraySize.error();
    }

    const [queryNameAst] = ast.args;
    const queryName =
      queryNameAst.type === 'STRING' ? queryNameAst.value : undefined;
    const categoryCount = queryName
      ? this.getFormulaQueryContext()?.queryExtractCategoriesPrefetch?.get(
          queryName,
        )?.length
      : undefined;

    return new ArraySize(1, Math.max(categoryCount ?? 1, 1));
  }

  queryExtractTimeframeStart(ast: ProcedureAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('QUERY_EXTRACT_TIMEFRAME_START'),
      (queryName: string) => {
        const ctx = this.getFormulaQueryContext();
        ctx?.queryExtractTimeframeStartNames?.add(queryName);
        return ctx?.queryExtractTimeframeStartPrefetch?.get(queryName) ?? '';
      },
    );
  }

  queryExtractTimeframeEnd(ast: ProcedureAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('QUERY_EXTRACT_TIMEFRAME_END'),
      (queryName: string) => {
        const ctx = this.getFormulaQueryContext();
        ctx?.queryExtractTimeframeEndNames?.add(queryName);
        return ctx?.queryExtractTimeframeEndPrefetch?.get(queryName) ?? '';
      },
    );
  }

  budgetQuery(ast: ProcedureAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('BUDGET_QUERY'),
      (
        dimension: string,
        categories: SimpleRangeValue,
        startMonth: string,
        endMonth: string,
      ) => {
        const ctx = this.getFormulaQueryContext();
        const request: BudgetQueryRequest = {
          dimension: dimension.toLowerCase(),
          categoryIds: categoryRangeToIds(categories),
          startMonth,
          endMonth,
        };
        const key = createBudgetQueryPrefetchKey(request);
        ctx?.budgetQueryRequests?.set(key, request);
        const error = ctx?.budgetQueryErrors?.get(key);
        if (error) {
          return new CellError(ErrorType.VALUE, error);
        }
        return ctx?.budgetQueryPrefetch?.get(key) ?? 0;
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
  QUERY: {
    method: 'query',
    parameters: [{ argumentType: FunctionArgumentType.STRING }],
  },
  QUERY_COUNT: {
    method: 'queryCount',
    parameters: [{ argumentType: FunctionArgumentType.STRING }],
  },
  QUERY_EXTRACT_CATEGORIES: {
    method: 'queryExtractCategories',
    sizeOfResultArrayMethod: 'queryExtractCategoriesSize',
    parameters: [{ argumentType: FunctionArgumentType.STRING }],
  },
  QUERY_EXTRACT_TIMEFRAME_END: {
    method: 'queryExtractTimeframeEnd',
    parameters: [{ argumentType: FunctionArgumentType.STRING }],
  },
  QUERY_EXTRACT_TIMEFRAME_START: {
    method: 'queryExtractTimeframeStart',
    parameters: [{ argumentType: FunctionArgumentType.STRING }],
  },
  BUDGET_QUERY: {
    method: 'budgetQuery',
    parameters: [
      { argumentType: FunctionArgumentType.STRING },
      { argumentType: FunctionArgumentType.RANGE },
      { argumentType: FunctionArgumentType.STRING },
      { argumentType: FunctionArgumentType.STRING },
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
    QUERY: 'QUERY',
    QUERY_COUNT: 'QUERY_COUNT',
    QUERY_EXTRACT_CATEGORIES: 'QUERY_EXTRACT_CATEGORIES',
    QUERY_EXTRACT_TIMEFRAME_END: 'QUERY_EXTRACT_TIMEFRAME_END',
    QUERY_EXTRACT_TIMEFRAME_START: 'QUERY_EXTRACT_TIMEFRAME_START',
    BUDGET_QUERY: 'BUDGET_QUERY',
    FORMATNUMBER: 'FORMATNUMBER',
    FORMATCURRENCY: 'FORMATCURRENCY',
  },
};
