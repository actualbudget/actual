import {
  FunctionArgumentType,
  FunctionPlugin,
  SimpleRangeValue,
} from 'hyperformula';
import type { InterpreterState } from 'hyperformula/typings/interpreter/InterpreterState';
import type { ProcedureAst } from 'hyperformula/typings/parser';

import { integerToAmount } from '#shared/util';

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
};

type CustomFunctionsContext = {
  balanceOfPrefetch?: Map<string, number>;
  formulaQuery?: FormulaQueryContext;
};

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
    .map(value => String(value))
    .filter(value => value.length > 0);
}

function categoryIdsToRange(categoryIds: string[]): SimpleRangeValue {
  return SimpleRangeValue.onlyValues(
    categoryIds.length > 0
      ? categoryIds.map(categoryId => [categoryId])
      : [['']],
  );
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
        return ctx?.budgetQueryPrefetch?.get(key) ?? 0;
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
  BUDGET_QUERY: {
    method: 'budgetQuery',
    parameters: [
      { argumentType: FunctionArgumentType.STRING },
      { argumentType: FunctionArgumentType.RANGE },
      { argumentType: FunctionArgumentType.STRING },
      { argumentType: FunctionArgumentType.STRING },
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
};

export const customFunctionsTranslations = {
  enUS: {
    BALANCE_OF: 'BALANCE_OF',
    BUDGET_QUERY: 'BUDGET_QUERY',
    FIXED: 'FIXED',
    INTEGER_TO_AMOUNT: 'INTEGER_TO_AMOUNT',
    QUERY: 'QUERY',
    QUERY_COUNT: 'QUERY_COUNT',
    QUERY_EXTRACT_CATEGORIES: 'QUERY_EXTRACT_CATEGORIES',
    QUERY_EXTRACT_TIMEFRAME_END: 'QUERY_EXTRACT_TIMEFRAME_END',
    QUERY_EXTRACT_TIMEFRAME_START: 'QUERY_EXTRACT_TIMEFRAME_START',
  },
};
