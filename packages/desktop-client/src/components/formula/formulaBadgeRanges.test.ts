import { afterEach, describe, expect, it } from 'vitest';

import {
  __resetFormulaBadgeParserForTests,
  cacheFormulaBadgeRanges,
  getFormulaBadgeRangeResult,
  getFormulaBadgeRanges,
  remapCachedFormulaBadgeRanges,
} from './formulaBadgeRanges';

afterEach(() => {
  __resetFormulaBadgeParserForTests();
});

function rangeFor(formula: string, text: string, offset = 0) {
  const from = formula.indexOf(text, offset);
  return {
    from,
    to: from + text.length,
  };
}

describe('getFormulaBadgeRanges', () => {
  it('badges transaction named expressions such as account_name', () => {
    const formula = '=CONCATENATE("Paid from ", account_name)';

    expect(
      getFormulaBadgeRanges({
        formula,
        mode: 'transaction',
      }),
    ).toEqual([
      {
        ...rangeFor(formula, 'account_name'),
        label: 'account_name',
        variant: 'named-expression',
      },
    ]);
  });

  it('does not badge transaction named expressions inside strings', () => {
    const formula = '=CONCATENATE("account_name", account_name)';

    expect(
      getFormulaBadgeRanges({
        formula,
        mode: 'transaction',
      }),
    ).toEqual([
      {
        ...rangeFor(formula, 'account_name', formula.indexOf(', ')),
        label: 'account_name',
        variant: 'named-expression',
      },
    ]);
  });

  it('handles repeated transaction named expressions with distinct ranges', () => {
    const formula = '=IF(account_name=payee_name, account_name, payee_name)';
    const firstAccountName = rangeFor(formula, 'account_name');
    const payeeName = rangeFor(formula, 'payee_name');
    const secondAccountName = rangeFor(
      formula,
      'account_name',
      firstAccountName.to,
    );
    const secondPayeeName = rangeFor(formula, 'payee_name', payeeName.to);

    expect(
      getFormulaBadgeRanges({
        formula,
        mode: 'transaction',
      }),
    ).toEqual([
      {
        ...firstAccountName,
        label: 'account_name',
        variant: 'named-expression',
      },
      {
        ...payeeName,
        label: 'payee_name',
        variant: 'named-expression',
      },
      {
        ...secondAccountName,
        label: 'account_name',
        variant: 'named-expression',
      },
      {
        ...secondPayeeName,
        label: 'payee_name',
        variant: 'named-expression',
      },
    ]);
  });

  it('badges provided query variables', () => {
    const formula = '=IF(result > 0, result, 0)';

    expect(
      getFormulaBadgeRanges({
        formula,
        mode: 'query',
        variables: {
          result: 42,
        },
      }),
    ).toEqual([
      {
        ...rangeFor(formula, 'result'),
        label: 'result',
        variant: 'named-expression',
      },
      {
        ...rangeFor(formula, 'result', formula.indexOf(',')),
        label: 'result',
        variant: 'named-expression',
      },
    ]);
  });

  it('badges query names only in the first argument of query functions', () => {
    const formula =
      '=CONCATENATE("Groceries", QUERY("Groceries"), QUERY_COUNT("Income"), QUERY_EXTRACT_CATEGORIES("Groceries"))';

    expect(
      getFormulaBadgeRanges({
        formula,
        mode: 'query',
        queries: {
          Groceries: {},
          Income: {},
        },
      }),
    ).toEqual([
      {
        ...rangeFor(formula, '"Groceries"', formula.indexOf('QUERY(')),
        label: 'Groceries',
        variant: 'query-name',
      },
      {
        ...rangeFor(formula, '"Income"'),
        label: 'Income',
        variant: 'query-name',
      },
      {
        ...rangeFor(
          formula,
          '"Groceries"',
          formula.indexOf('QUERY_EXTRACT_CATEGORIES'),
        ),
        label: 'Groceries',
        variant: 'query-name',
      },
    ]);
  });

  it('badges direct budget query dimensions, category arrays, and timeframes', () => {
    const formula =
      '=BUDGET_QUERY("spent", {"cat-a"; "cat-b"}, "2026-01", "2026-03")';

    expect(
      getFormulaBadgeRanges({
        formula,
        mode: 'query',
        categoryBadges: {
          'cat-a': 'Food -> Groceries',
          'cat-b': 'Bills -> Rent',
        },
      }),
    ).toEqual([
      {
        ...rangeFor(formula, '"spent"'),
        label: 'spent',
        variant: 'budget-dimension',
      },
      {
        ...rangeFor(formula, '"cat-a"'),
        label: 'Food -> Groceries',
        variant: 'budget-category-list',
        categories: [{ id: 'cat-a', label: 'Food -> Groceries' }],
      },
      {
        ...rangeFor(formula, '"cat-b"'),
        label: 'Bills -> Rent',
        variant: 'budget-category-list',
        categories: [{ id: 'cat-b', label: 'Bills -> Rent' }],
      },
      {
        ...rangeFor(formula, '"2026-01"'),
        label: '2026-01',
        variant: 'budget-timeframe',
      },
      {
        ...rangeFor(formula, '"2026-03"'),
        label: '2026-03',
        variant: 'budget-timeframe',
      },
    ]);
  });

  it('badges both budget timeframe formats', () => {
    const formula = '=BUDGET_QUERY("spent", {"cat-a"}, "2026-1", "3-2026")';

    expect(
      getFormulaBadgeRanges({
        formula,
        mode: 'query',
      }).filter(range => range.variant === 'budget-timeframe'),
    ).toEqual([
      {
        ...rangeFor(formula, '"2026-1"'),
        label: '2026-1',
        variant: 'budget-timeframe',
      },
      {
        ...rangeFor(formula, '"3-2026"'),
        label: '3-2026',
        variant: 'budget-timeframe',
      },
    ]);
  });

  it('does not badge empty or incomplete budget timeframe strings', () => {
    const formula = '=BUDGET_QUERY("spent", {"cat-a"}, "", "2026-")';

    expect(
      getFormulaBadgeRanges({
        formula,
        mode: 'query',
      }).filter(range => range.variant === 'budget-timeframe'),
    ).toEqual([]);
  });

  it('badges comma-separated category ids inside one budget category string', () => {
    const firstCategoryId = '1383331d-c13d-40be-a693-3157440d0017';
    const secondCategoryId = 'e762cd1d-8a13-4791-8345-bc812f45b1ef';
    const formula = `=BUDGET_QUERY("spent", "${firstCategoryId}, ${secondCategoryId}", "2026-01", "2026-03")`;

    expect(
      getFormulaBadgeRanges({
        formula,
        mode: 'query',
        categoryBadges: {
          [firstCategoryId]: 'Food -> Groceries',
          [secondCategoryId]: 'Bills -> Rent',
        },
      }).filter(range => range.variant === 'budget-category-list'),
    ).toEqual([
      {
        ...rangeFor(formula, `"${firstCategoryId}, ${secondCategoryId}"`),
        label: 'Food -> Groceries, Bills -> Rent',
        variant: 'budget-category-list',
        categories: [
          { id: firstCategoryId, label: 'Food -> Groceries' },
          { id: secondCategoryId, label: 'Bills -> Rent' },
        ],
      },
    ]);
  });

  it('badges comma-separated category ids without spaces inside one budget category string', () => {
    const firstCategoryId = '1383331d-c13d-40be-a693-3157440d0017';
    const secondCategoryId = 'e762cd1d-8a13-4791-8345-bc812f45b1ef';
    const formula = `=BUDGET_QUERY("spent", "${firstCategoryId},${secondCategoryId}", "2026-01", "2026-03")`;

    expect(
      getFormulaBadgeRanges({
        formula,
        mode: 'query',
        categoryBadges: {
          [firstCategoryId]: 'Food -> Groceries',
          [secondCategoryId]: 'Bills -> Rent',
        },
      }).filter(range => range.variant === 'budget-category-list'),
    ).toEqual([
      {
        ...rangeFor(formula, `"${firstCategoryId},${secondCategoryId}"`),
        label: 'Food -> Groceries, Bills -> Rent',
        variant: 'budget-category-list',
        categories: [
          { id: firstCategoryId, label: 'Food -> Groceries' },
          { id: secondCategoryId, label: 'Bills -> Rent' },
        ],
      },
    ]);
  });

  it('remaps cached budget query badges when a syntax error prevents AST parsing', () => {
    const validFormula =
      '=BUDGET_QUERY("budgeted", "cat-a", "2026-01", QUERY_EXTRACT_TIMEFRAME_END("abc")+a)';
    const invalidFormula =
      '=BUDGET_QUERY("budgeted", "cat-a", "2026-01", QUERY_EXTRACT_TIMEFRAME_END("abc")+)-';
    const result = getFormulaBadgeRangeResult({
      formula: validFormula,
      mode: 'query',
      queries: { abc: {} },
      categoryBadges: { 'cat-a': 'Food -> Groceries' },
    });
    const invalidResult = getFormulaBadgeRangeResult({
      formula: invalidFormula,
      mode: 'query',
      queries: { abc: {} },
      categoryBadges: { 'cat-a': 'Food -> Groceries' },
    });

    expect(result.status).toBe('ok');
    expect(invalidResult.status).toBe('partial');
    expect(
      invalidResult.ranges.concat(
        remapCachedFormulaBadgeRanges({
          formula: invalidFormula,
          cachedRanges: cacheFormulaBadgeRanges(validFormula, result.ranges),
          blockedRanges: invalidResult.ranges,
        }),
      ),
    ).toEqual([
      {
        ...rangeFor(invalidFormula, '"budgeted"'),
        label: 'budgeted',
        variant: 'budget-dimension',
      },
      {
        ...rangeFor(invalidFormula, '"cat-a"'),
        label: 'Food -> Groceries',
        variant: 'budget-category-list',
        categories: [{ id: 'cat-a', label: 'Food -> Groceries' }],
      },
      {
        ...rangeFor(invalidFormula, '"2026-01"'),
        label: '2026-01',
        variant: 'budget-timeframe',
      },
      {
        ...rangeFor(invalidFormula, '"abc"'),
        label: 'abc',
        variant: 'query-name',
      },
    ]);
  });

  it('ignores empty cached source text when remapping badges', () => {
    expect(
      remapCachedFormulaBadgeRanges({
        formula: '=SUM(1, 2)',
        cachedRanges: [
          {
            from: 1,
            to: 1,
            label: 'empty',
            sourceText: '',
            variant: 'named-expression',
          },
        ],
      }),
    ).toEqual([]);
  });

  it('falls back to tokenized named expressions for incomplete formulas', () => {
    const formula = '=CONCATENATE(account_name,';

    expect(
      getFormulaBadgeRanges({
        formula,
        mode: 'transaction',
      }),
    ).toEqual([
      {
        ...rangeFor(formula, 'account_name'),
        label: 'account_name',
        variant: 'named-expression',
      },
    ]);
  });

  it('segments a joined named expression token when it is fully badgeable', () => {
    const formula = '=account_nameaccount';

    expect(
      getFormulaBadgeRanges({
        formula,
        mode: 'transaction',
      }),
    ).toEqual([
      {
        ...rangeFor(formula, 'account_name'),
        label: 'account_name',
        variant: 'named-expression',
      },
      {
        ...rangeFor(
          formula,
          'account',
          formula.indexOf('account_name') + 'account_name'.length,
        ),
        label: 'account',
        variant: 'named-expression',
      },
    ]);
  });

  it('does not partially segment unknown named expression tokens', () => {
    expect(
      getFormulaBadgeRanges({
        formula: '=account_namefoo',
        mode: 'transaction',
      }),
    ).toEqual([]);
  });

  it('returns no ranges for non-formulas', () => {
    expect(
      getFormulaBadgeRanges({
        formula: 'account_name',
        mode: 'transaction',
      }),
    ).toEqual([]);
  });
});
