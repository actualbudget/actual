import { describe, expect, it } from 'vitest';

import {
  FORMULA_FUNCTIONS_BY_MODE,
  getDynamicReportQueryCompletions,
  getFormulaCategoryForName,
  getFormulaFunctionCatalog,
  getFormulaFunctionCategoryConfig,
  getFormulaFunctionsForMode,
  getFunctionCompletions,
  getNamedVariableCompletions,
  getRuleFieldCompletions,
  sortFormulaCompletions,
} from './formulaCatalog';

function labels(items: Array<{ label: string }>): string[] {
  return items.map(item => item.label);
}

describe('formulaCatalog', () => {
  it('has catalog definitions for every available function', () => {
    const catalog = getFormulaFunctionCatalog();

    for (const functionNames of Object.values(FORMULA_FUNCTIONS_BY_MODE)) {
      for (const functionName of functionNames) {
        expect(catalog[functionName]).toBeDefined();
      }
    }
  });

  it('does not duplicate function names within a mode', () => {
    for (const functionNames of Object.values(FORMULA_FUNCTIONS_BY_MODE)) {
      expect(new Set(functionNames).size).toBe(functionNames.length);
    }
  });

  it('keeps report-only query functions out of rule formulas', () => {
    const reportFunctions = getFormulaFunctionsForMode('query');
    const ruleFunctions = getFormulaFunctionsForMode('transaction');

    expect(reportFunctions.QUERY).toBeDefined();
    expect(reportFunctions.QUERY_COUNT).toBeDefined();
    expect(reportFunctions.BUDGET_QUERY).toBeDefined();
    expect(reportFunctions.BALANCE_OF).toBeUndefined();

    expect(ruleFunctions.BALANCE_OF).toBeDefined();
    expect(ruleFunctions.QUERY).toBeUndefined();
    expect(ruleFunctions.QUERY_COUNT).toBeUndefined();
  });

  it('keeps shared functions available to reports and rules', () => {
    const reportFunctions = getFormulaFunctionsForMode('query');
    const ruleFunctions = getFormulaFunctionsForMode('transaction');

    for (const functionName of [
      'SUM',
      'FORMATNUMBER',
      'FORMATCURRENCY',
      'INTEGER_TO_AMOUNT',
    ]) {
      expect(reportFunctions[functionName]).toBeDefined();
      expect(ruleFunctions[functionName]).toBeDefined();
    }
  });

  it('has completion and highlighting config for every function category', () => {
    const categoryConfig = getFormulaFunctionCategoryConfig();

    for (const func of Object.values(getFormulaFunctionCatalog())) {
      expect(categoryConfig[func.category]).toEqual(
        expect.objectContaining({
          section: expect.any(String),
          order: expect.any(Number),
          tokenClass: expect.any(String),
        }),
      );
      expect(getFormulaCategoryForName(func.name)).toBe(func.category);
    }
  });

  it('builds rule field completions', () => {
    expect(labels(getRuleFieldCompletions())).toEqual(
      expect.arrayContaining(['amount', 'date', 'notes', 'balance']),
    );
  });

  it('builds report query completions from saved query names', () => {
    const completions = getDynamicReportQueryCompletions({
      Expenses: {},
    });
    const spentBudgetQueryLabel =
      'BUDGET_QUERY("spent", QUERY_EXTRACT_CATEGORIES("Expenses"), ' +
      'QUERY_EXTRACT_TIMEFRAME_START("Expenses"), ' +
      'QUERY_EXTRACT_TIMEFRAME_END("Expenses"))';

    expect(labels(completions)).toEqual(
      expect.arrayContaining([
        'QUERY("Expenses")',
        'QUERY_COUNT("Expenses")',
        spentBudgetQueryLabel,
      ]),
    );
  });

  it('sorts named variables above function completions', () => {
    const sorted = sortFormulaCompletions([
      ...getFunctionCompletions('query'),
      ...getNamedVariableCompletions({ RESULT: 42 }),
    ]);

    expect(sorted[0].label).toBe('RESULT');
  });
});
