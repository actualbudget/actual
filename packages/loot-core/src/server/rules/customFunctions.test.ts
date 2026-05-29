import { HyperFormula } from 'hyperformula';
import enUS from 'hyperformula/i18n/languages/enUS';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  createBudgetQueryPrefetchKey,
  CustomFunctionsPlugin,
  customFunctionsTranslations,
} from './customFunctions';
import type { FormulaQueryContext } from './customFunctions';

function createFormulaQueryContext(): Required<FormulaQueryContext> {
  return {
    queryNames: new Set(),
    queryCountNames: new Set(),
    queryExtractCategoryNames: new Set(),
    queryExtractTimeframeStartNames: new Set(),
    queryExtractTimeframeEndNames: new Set(),
    budgetQueryRequests: new Map(),
    querySumPrefetch: new Map(),
    queryCountPrefetch: new Map(),
    queryExtractCategoriesPrefetch: new Map(),
    queryExtractTimeframeStartPrefetch: new Map(),
    queryExtractTimeframeEndPrefetch: new Map(),
    budgetQueryPrefetch: new Map(),
    budgetQueryErrors: new Map(),
  };
}

function evaluateFormula(
  formula: string,
  formulaQueryContext: FormulaQueryContext,
) {
  const hf = HyperFormula.buildEmpty({
    licenseKey: 'gpl-v3',
    language: 'enUS',
    context: {
      formulaQuery: formulaQueryContext,
    },
  });

  try {
    const sheetName = hf.addSheet('Sheet1');
    const sheetId = hf.getSheetId(sheetName);

    if (sheetId === undefined) {
      throw new Error('Failed to create sheet');
    }

    hf.setCellContents({ sheet: sheetId, col: 0, row: 0 }, [[formula]]);

    return hf.getCellValue({ sheet: sheetId, col: 0, row: 0 });
  } finally {
    hf.destroy();
  }
}

describe('CustomFunctionsPlugin formula query functions', () => {
  beforeAll(() => {
    if (!HyperFormula.getRegisteredLanguagesCodes().includes('enUS')) {
      HyperFormula.registerLanguage('enUS', enUS);
    }

    HyperFormula.registerFunctionPlugin(
      CustomFunctionsPlugin,
      customFunctionsTranslations,
    );
  });

  it('records QUERY and QUERY_COUNT requests and returns prefetched values', () => {
    const context = createFormulaQueryContext();
    context.querySumPrefetch.set('income', 123.45);
    context.queryCountPrefetch.set('income', 3);

    const result = evaluateFormula(
      '=QUERY("income") + QUERY_COUNT("income")',
      context,
    );

    expect(result).toBeCloseTo(126.45);
    expect(context.queryNames).toEqual(new Set(['income']));
    expect(context.queryCountNames).toEqual(new Set(['income']));
  });

  it('defaults missing query prefetch values to zero while collecting names', () => {
    const context = createFormulaQueryContext();

    const result = evaluateFormula(
      '=QUERY("missing") + QUERY_COUNT("missing")',
      context,
    );

    expect(result).toBe(0);
    expect(context.queryNames).toEqual(new Set(['missing']));
    expect(context.queryCountNames).toEqual(new Set(['missing']));
  });

  it('resolves BUDGET_QUERY from prefetched nested query extraction values', () => {
    const context = createFormulaQueryContext();
    const request = {
      dimension: 'spent',
      categoryIds: ['cat-a', 'cat-b'],
      startMonth: '2026-01',
      endMonth: '2026-03',
    };
    const budgetKey = createBudgetQueryPrefetchKey(request);

    context.queryExtractCategoriesPrefetch.set('expenses', request.categoryIds);
    context.queryExtractTimeframeStartPrefetch.set(
      'expenses',
      request.startMonth,
    );
    context.queryExtractTimeframeEndPrefetch.set('expenses', request.endMonth);
    context.budgetQueryPrefetch.set(budgetKey, 42.5);

    const result = evaluateFormula(
      '=BUDGET_QUERY("spent", QUERY_EXTRACT_CATEGORIES("expenses"), QUERY_EXTRACT_TIMEFRAME_START("expenses"), QUERY_EXTRACT_TIMEFRAME_END("expenses"))',
      context,
    );

    expect(result).toBe(42.5);
    expect(context.queryExtractCategoryNames).toEqual(new Set(['expenses']));
    expect(context.queryExtractTimeframeStartNames).toEqual(
      new Set(['expenses']),
    );
    expect(context.queryExtractTimeframeEndNames).toEqual(
      new Set(['expenses']),
    );
    expect(context.budgetQueryRequests.get(budgetKey)).toEqual(request);
  });

  it('surfaces BUDGET_QUERY prefetch failures as formula errors', () => {
    const context = createFormulaQueryContext();
    const request = {
      dimension: 'spnt',
      categoryIds: ['cat-a'],
      startMonth: '2026-01',
      endMonth: '2026-03',
    };
    const budgetKey = createBudgetQueryPrefetchKey(request);

    context.queryExtractCategoriesPrefetch.set('expenses', request.categoryIds);
    context.queryExtractTimeframeStartPrefetch.set(
      'expenses',
      request.startMonth,
    );
    context.queryExtractTimeframeEndPrefetch.set('expenses', request.endMonth);
    context.budgetQueryErrors.set(
      budgetKey,
      'Invalid BUDGET_QUERY dimension: spnt',
    );

    const result = evaluateFormula(
      '=BUDGET_QUERY("spnt", QUERY_EXTRACT_CATEGORIES("expenses"), QUERY_EXTRACT_TIMEFRAME_START("expenses"), QUERY_EXTRACT_TIMEFRAME_END("expenses"))',
      context,
    );

    expect(result).toMatchObject({
      type: 'VALUE',
      message: 'Invalid BUDGET_QUERY dimension: spnt',
    });
  });
});
