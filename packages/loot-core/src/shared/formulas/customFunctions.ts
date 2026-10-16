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
  balanceOfNames?: Set<string>;
  budgetQueryRequests?: Map<string, BudgetQueryRequest>;
  querySumPrefetch?: Map<string, number>;
  queryCountPrefetch?: Map<string, number>;
  queryExtractCategoriesPrefetch?: Map<string, string[]>;
  queryExtractTimeframeStartPrefetch?: Map<string, string>;
  queryExtractTimeframeEndPrefetch?: Map<string, string>;
  balanceOfPrefetch?: Map<string, number>;
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
  decimalPlaces: number;
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
      decimalPlaces: 2,
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
    .flatMap(value => String(value).split(','))
    .map(value => value.trim())
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

function getCurrencySymbolPositionFromArg(
  value: string | undefined,
  fallback: CurrencySymbolPosition,
): CurrencySymbolPosition {
  return value === 'before' || value === 'after' ? value : fallback;
}

function regexExtractMatch(result: RegExpMatchArray | null): string | string[] {
  if (!result || result.length === 0) return '';
  if (result.length === 1) return result[0];
  if (result.length === 2) return result[1];

  return result.slice(1);
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
        if (ctx?.balanceOfPrefetch) {
          // Rule formulas: prefetched relative to the transaction being evaluated.
          return ctx.balanceOfPrefetch.get(accountKey) ?? 0;
        }

        // Report/query formulas: no single transaction to be "before", so this
        // resolves to the account's current balance.
        const formulaQueryCtx = this.getFormulaQueryContext();
        formulaQueryCtx?.balanceOfNames?.add(accountKey);
        return formulaQueryCtx?.balanceOfPrefetch?.get(accountKey) ?? 0;
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
    const hasDecimalsArg = ast.args.length > 1;
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
          return new CellError(ErrorType.VALUE);
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
        const actualDecimals = hasDecimalsArg
          ? (decimals ?? 2)
          : prefs.decimalPlaces;

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
    const hasCurrencySymbolPositionArg = ast.args.length > 5;
    const hasCurrencySpaceBetweenAmountAndSymbolArg = ast.args.length > 6;

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
        currencySymbolPosition?: string,
        currencySpaceBetweenAmountAndSymbol?: boolean,
      ) => {
        const num = Number(value);
        if (isNaN(num)) {
          return new CellError(ErrorType.VALUE);
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
        const actualCurrencySymbolPosition = hasCurrencySymbolPositionArg
          ? getCurrencySymbolPositionFromArg(
              currencySymbolPosition,
              prefs.currencySymbolPosition,
            )
          : prefs.currencySymbolPosition;
        const actualCurrencySpaceBetweenAmountAndSymbol =
          hasCurrencySpaceBetweenAmountAndSymbolArg &&
          currencySpaceBetweenAmountAndSymbol !== undefined
            ? currencySpaceBetweenAmountAndSymbol
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

  regexExtract(ast: ProcedureAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('REGEXEXTRACT'),
      (text: string, regex: string, flags: string = '') => {
        try {
          const regexp = new RegExp(regex, flags);

          if (regexp.global) {
            const allMatches = [...text.matchAll(regexp)];

            if (allMatches.length === 0) return '';
            return SimpleRangeValue.onlyValues(
              allMatches.map(match => {
                return [regexExtractMatch(match)].flat();
              }),
            );
          } else {
            const match = text.match(new RegExp(regex, flags));
            const result = regexExtractMatch(match);
            if (typeof result === 'string') return result;
            return SimpleRangeValue.onlyValues([result]);
          }
        } catch {
          return new CellError(ErrorType.VALUE, 'Invalid regex');
        }
      },
    );
  }

  regexMatch(ast: ProcedureAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('REGEXMATCH'),
      (text: string, regex: string, flags: string = '') => {
        try {
          const match = text.match(new RegExp(regex, flags));
          return match !== null;
        } catch {
          return new CellError(ErrorType.VALUE, 'Invalid regex');
        }
      },
    );
  }

  regexReplace(ast: ProcedureAst, state: InterpreterState) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('REGEXREPLACE'),
      (
        text: string,
        regex: string,
        replacement: string,
        flags: string = '',
      ) => {
        try {
          return text.replace(new RegExp(regex, flags), replacement);
        } catch {
          return new CellError(ErrorType.VALUE, 'Invalid regex');
        }
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
      {
        argumentType: FunctionArgumentType.STRING,
        optionalArg: true,
        defaultValue: 'before',
      },
      {
        argumentType: FunctionArgumentType.BOOLEAN,
        optionalArg: true,
        defaultValue: false,
      },
    ],
  },
  REGEXEXTRACT: {
    method: 'regexExtract',
    parameters: [
      // Text
      { argumentType: FunctionArgumentType.STRING },
      // Regex
      { argumentType: FunctionArgumentType.STRING },
      // Flags
      {
        argumentType: FunctionArgumentType.STRING,
        optionalArg: true,
        defaultValue: '',
      },
    ],
  },
  REGEXMATCH: {
    method: 'regexMatch',
    parameters: [
      // Text
      { argumentType: FunctionArgumentType.STRING },
      // Regex
      { argumentType: FunctionArgumentType.STRING },
      // Flags
      {
        argumentType: FunctionArgumentType.STRING,
        optionalArg: true,
        defaultValue: '',
      },
    ],
  },
  REGEXREPLACE: {
    method: 'regexReplace',
    parameters: [
      // Text
      { argumentType: FunctionArgumentType.STRING },
      // Regex
      { argumentType: FunctionArgumentType.STRING },
      // Replacement
      {
        argumentType: FunctionArgumentType.STRING,
        optionalArg: true,
        defaultValue: '',
      },
      // Flags
      {
        argumentType: FunctionArgumentType.STRING,
        optionalArg: true,
        defaultValue: 'g',
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
    REGEXEXTRACT: 'REGEXEXTRACT',
    REGEXMATCH: 'REGEXMATCH',
    REGEXREPLACE: 'REGEXREPLACE',
  },
};
