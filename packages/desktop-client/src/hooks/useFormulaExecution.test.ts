import { createElement } from 'react';
import type { ReactNode } from 'react';

import {
  clearServer,
  initServer,
} from '@actual-app/core/platform/client/connection';
import { getCurrency } from '@actual-app/core/shared/currencies';
import type {
  RuleConditionEntity,
  TimeFrame,
} from '@actual-app/core/types/models';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import {
  buildFilteredTransactionsQuery,
  useFormulaExecution,
} from './useFormulaExecution';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

type SerializedQuery = {
  filterExpressions: ReadonlyArray<Record<string, unknown>>;
  tableOptions?: Record<string, unknown>;
};

type QueryConfig = {
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
  timeFrame?: Partial<TimeFrame>;
};

function categoryCondition(value: string) {
  return {
    field: 'category',
    op: 'is',
    value,
    type: 'id',
  } satisfies RuleConditionEntity;
}

function queryHasCategory(query: SerializedQuery, categoryId: string) {
  return query.filterExpressions.some(filterExpression => {
    const filters = filterExpression.$and;
    return (
      Array.isArray(filters) &&
      filters.some(
        filter =>
          typeof filter === 'object' &&
          filter !== null &&
          'category' in filter &&
          filter.category === categoryId,
      )
    );
  });
}

function findQueryByCategory(
  queryPayloads: SerializedQuery[],
  categoryId: string,
) {
  const query = queryPayloads.find(payload =>
    queryHasCategory(payload, categoryId),
  );
  if (!query) {
    throw new Error(`No query found for category ${categoryId}`);
  }
  return query;
}

function expectQueryDateRange(
  queryPayloads: SerializedQuery[],
  categoryId: string,
  startDate: string,
  endDate: string,
) {
  expect(
    findQueryByCategory(queryPayloads, categoryId).filterExpressions[0],
  ).toEqual({
    $and: [{ date: { $gte: startDate } }, { date: { $lte: endDate } }],
  });
}

const formulaQueries: Record<string, QueryConfig> = {
  Income: {
    conditions: [categoryCondition('income-cat')],
    conditionsOp: 'and',
    timeFrame: {
      start: '2024-01-01',
      end: '2024-03-31',
      mode: 'sliding-window',
    },
  },
  Expenses: {
    conditions: [categoryCondition('expense-cat')],
    conditionsOp: 'and',
    timeFrame: {
      start: '2024-03-01',
      end: '2024-03-31',
      mode: 'sliding-window',
    },
  },
};

describe('formula query timeframes', () => {
  let previousCurrentMonth: typeof global.currentMonth;
  let queryPayloads: SerializedQuery[];

  beforeEach(() => {
    previousCurrentMonth = global.currentMonth;
    queryPayloads = [];
    initServer({
      'formula-load-user-preferences': async () => ({
        currency: getCurrency('USD'),
        numberFormat: 'comma-dot',
        decimalPlaces: 2,
        thousandsSeparator: ',',
        decimalSeparator: '.',
        locale: 'en-US',
        currencySymbolPosition: 'before',
        currencySpaceBetweenAmountAndSymbol: false,
      }),
      'make-filters-from-conditions': async ({ conditions }) => {
        const ruleConditions = Array.isArray(conditions) ? conditions : [];

        return {
          filters: ruleConditions.map(condition => {
            const { field, value } = condition as RuleConditionEntity;
            return { [field]: value };
          }),
        };
      },
      query: async payload => {
        queryPayloads.push(payload as unknown as SerializedQuery);
        return { data: queryPayloads.length * 100, dependencies: [] };
      },
    });
  });

  afterEach(async () => {
    global.currentMonth = previousCurrentMonth;
    await clearServer();
  });

  it('applies default bounds for partial static query timeframes', async () => {
    const query = await buildFilteredTransactionsQuery({
      timeFrame: {
        mode: 'static',
        start: '2016-10',
      },
    });

    expect(query.serialize().filterExpressions).toEqual([
      {
        $and: [
          { date: { $gte: '2016-10-01' } },
          { date: { $lte: '2017-01-31' } },
        ],
      },
    ]);
  });

  it('applies preset query timeframe modes through calculateTimeRange', async () => {
    const query = await buildFilteredTransactionsQuery({
      timeFrame: {
        mode: 'lastMonth',
      },
    });

    expect(query.serialize().filterExpressions).toEqual([
      {
        $and: [
          { date: { $gte: '2016-12-01' } },
          { date: { $lte: '2016-12-31' } },
        ],
      },
    ]);
  });

  it('shifts each formula report query window when the current month changes', async () => {
    async function executeFormula() {
      queryPayloads = [];

      const { result, unmount } = renderHook(
        () =>
          useFormulaExecution(
            '=QUERY("Income") + QUERY("Expenses")',
            formulaQueries,
            0,
          ),
        { wrapper: TestProviders },
      );

      await waitFor(() => expect(result.current.result).toBe(3));
      unmount();

      return [...queryPayloads];
    }

    global.currentMonth = '2026-06';
    const juneQueries = await executeFormula();

    expectQueryDateRange(juneQueries, 'income-cat', '2026-04-01', '2026-06-30');
    expectQueryDateRange(
      juneQueries,
      'expense-cat',
      '2026-06-01',
      '2026-06-30',
    );

    global.currentMonth = '2026-07';
    const julyQueries = await executeFormula();

    expectQueryDateRange(julyQueries, 'income-cat', '2026-05-01', '2026-07-31');
    expectQueryDateRange(
      julyQueries,
      'expense-cat',
      '2026-07-01',
      '2026-07-31',
    );
  });
});

describe('BALANCE_OF in query mode', () => {
  let queryPayloads: SerializedQuery[];

  beforeEach(() => {
    queryPayloads = [];
    initServer({
      'formula-load-user-preferences': async () => ({
        currency: getCurrency('USD'),
        numberFormat: 'comma-dot',
        decimalPlaces: 2,
        thousandsSeparator: ',',
        decimalSeparator: '.',
        locale: 'en-US',
        currencySymbolPosition: 'before',
        currencySpaceBetweenAmountAndSymbol: false,
      }),
      query: async payload => {
        queryPayloads.push(payload as unknown as SerializedQuery);
        return { data: 12345, dependencies: [] };
      },
    });
  });

  afterEach(async () => {
    await clearServer();
  });

  it('resolves an account by id and queries its balance', async () => {
    const { result } = renderHook(
      () =>
        useFormulaExecution('=BALANCE_OF("acc1")', {}, 0, undefined, [
          { id: 'acc1', name: 'Checking' },
        ]),
      { wrapper: TestProviders },
    );

    await waitFor(() => expect(result.current.result).toBe(123.45));

    const balanceQuery = queryPayloads.find(payload =>
      payload.filterExpressions.some(
        expression => (expression as { account?: string }).account === 'acc1',
      ),
    );
    expect(balanceQuery).toBeDefined();
  });

  it('resolves an account by exact name', async () => {
    const { result } = renderHook(
      () =>
        useFormulaExecution('=BALANCE_OF("Checking")', {}, 0, undefined, [
          { id: 'acc1', name: 'Checking' },
        ]),
      { wrapper: TestProviders },
    );

    await waitFor(() => expect(result.current.result).toBe(123.45));

    const balanceQuery = queryPayloads.find(payload =>
      payload.filterExpressions.some(
        expression => (expression as { account?: string }).account === 'acc1',
      ),
    );
    expect(balanceQuery).toBeDefined();
  });

  it('returns 0 for an unknown account', async () => {
    const { result } = renderHook(
      () =>
        useFormulaExecution('=BALANCE_OF("nope")', {}, 0, undefined, [
          { id: 'acc1', name: 'Checking' },
        ]),
      { wrapper: TestProviders },
    );

    await waitFor(() => expect(result.current.result).toBe(0));
    expect(queryPayloads).toHaveLength(0);
  });
});

describe('formula execution stability', () => {
  let executionCount: number;

  beforeEach(() => {
    executionCount = 0;
    initServer({
      'formula-load-user-preferences': async () => {
        executionCount += 1;
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
      },
    });
  });

  afterEach(async () => {
    await clearServer();
  });

  it('does not re-execute when callers pass new objects each render', async () => {
    // Callers such as FormulaCard build `queries`/`accounts` inline, so those
    // objects have a fresh identity on every render. Keying the effect on
    // identity would re-execute forever, flickering the card between value and
    // skeleton.
    const { result, rerender } = renderHook(
      () =>
        useFormulaExecution('=SUM(1, 2, 3)', {}, undefined, { RESULT: 0 }, [
          { id: 'acc1', name: 'Checking' },
        ]),
      { wrapper: TestProviders },
    );

    await waitFor(() => expect(result.current.result).toBe(6));
    expect(executionCount).toBe(1);

    rerender();
    rerender();
    rerender();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(executionCount).toBe(1);
  });

  it('re-executes when the queries contents actually change', async () => {
    const { result, rerender } = renderHook(
      ({ conditionValue }: { conditionValue: string }) =>
        useFormulaExecution('=SUM(1, 2, 3)', {
          Income: { conditions: [categoryCondition(conditionValue)] },
        }),
      {
        wrapper: TestProviders,
        initialProps: { conditionValue: 'income-cat' },
      },
    );

    await waitFor(() => expect(result.current.result).toBe(6));
    expect(executionCount).toBe(1);

    rerender({ conditionValue: 'other-cat' });

    await waitFor(() => expect(executionCount).toBe(2));
  });

  it('clears the loading state for a formula that does not start with =', async () => {
    const { result } = renderHook(
      () => useFormulaExecution('SUM(1, 2, 3)', {}),
      { wrapper: TestProviders },
    );

    await waitFor(() =>
      expect(result.current.error).toBe('Formula must start with ='),
    );
    expect(result.current.isLoading).toBe(false);
  });
});

describe('recorded formula amounts', () => {
  afterEach(async () => {
    await clearServer();
  });

  it.each([
    [0, 1234],
    [2, 12.34],
    [3, 1.234],
  ])(
    'decodes QUERY, BALANCE_OF and BUDGET_QUERY at %idp',
    async (precision, expected) => {
      const store = createTestAppStore();
      store.dispatch(
        mergeSyncedPrefs({
          amountEncoding: JSON.stringify({
            version: 1,
            currencyCode: 'KWD',
            precision,
          }),
        }),
      );
      initServer({
        'formula-load-user-preferences': async () => ({
          currency: getCurrency('USD'),
          numberFormat: 'comma-dot',
          decimalPlaces: 2,
          thousandsSeparator: ',',
          decimalSeparator: '.',
          locale: 'en-US',
          currencySymbolPosition: 'before',
          currencySpaceBetweenAmountAndSymbol: false,
        }),
        'make-filters-from-conditions': async () => ({ filters: [] }),
        query: async () => ({ data: 1234, dependencies: [] }),
        'envelope-budget-month': async () => [
          { name: 'budget-cat-a', value: 1234 },
        ],
      });
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(TestProviders, { store, children });
      const cases = [
        ['=QUERY("Income")', { Income: {} }, undefined],
        ['=BALANCE_OF("account")', {}, [{ id: 'account', name: 'Checking' }]],
        [
          '=BUDGET_QUERY("budgeted", "cat-a", "2026-01", "2026-01")',
          {},
          undefined,
        ],
      ] as const;
      for (const [formula, queries, accounts] of cases) {
        const { result, unmount } = renderHook(
          () =>
            useFormulaExecution(
              formula,
              queries,
              0,
              undefined,
              accounts ? [...accounts] : undefined,
            ),
          { wrapper },
        );
        await waitFor(() => expect(result.current.result).toBe(expected));
        unmount();
      }
    },
  );

  it('refreshes query results when the recorded encoding changes', async () => {
    const store = createTestAppStore();
    initServer({
      'formula-load-user-preferences': async () => ({
        currency: getCurrency('USD'),
        numberFormat: 'comma-dot',
        decimalPlaces: 2,
        thousandsSeparator: ',',
        decimalSeparator: '.',
        locale: 'en-US',
        currencySymbolPosition: 'before',
        currencySpaceBetweenAmountAndSymbol: false,
      }),
      'make-filters-from-conditions': async () => ({ filters: [] }),
      query: async () => ({ data: 1234, dependencies: [] }),
    });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(TestProviders, { store, children });
    const { result } = renderHook(
      () => useFormulaExecution('=QUERY("Income")', { Income: {} }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.result).toBe(12.34));
    act(() => {
      store.dispatch(
        mergeSyncedPrefs({
          amountEncoding: JSON.stringify({
            version: 1,
            currencyCode: 'KWD',
            precision: 3,
          }),
        }),
      );
    });
    await waitFor(() => expect(result.current.result).toBe(1.234));
  });

  it('refreshes results when only the currency changes', async () => {
    const store = createTestAppStore();
    let currency = 'USD';
    initServer({
      'formula-load-user-preferences': async () => ({
        currency: getCurrency(currency),
        numberFormat: 'comma-dot',
        decimalPlaces: 2,
        thousandsSeparator: ',',
        decimalSeparator: '.',
        locale: 'en-US',
        currencySymbolPosition: 'before',
        currencySpaceBetweenAmountAndSymbol: false,
      }),
    });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(TestProviders, { store, children });
    const { result } = renderHook(
      () => useFormulaExecution('=FORMATCURRENCY(1)', {}),
      { wrapper },
    );
    await waitFor(() => expect(result.current.result).toContain('$'));
    currency = 'EUR';
    act(() => {
      store.dispatch(mergeSyncedPrefs({ defaultCurrencyCode: 'EUR' }));
    });
    await waitFor(() => expect(result.current.result).toContain('€'));
  });

  it('keeps formula rounding arguments independent of storage precision', async () => {
    const store = createTestAppStore();
    store.dispatch(
      mergeSyncedPrefs({
        amountEncoding: JSON.stringify({
          version: 1,
          currencyCode: 'KWD',
          precision: 3,
        }),
      }),
    );
    initServer({
      'formula-load-user-preferences': async () => ({
        currency: getCurrency('USD'),
        numberFormat: 'comma-dot',
        decimalPlaces: 2,
        thousandsSeparator: ',',
        decimalSeparator: '.',
        locale: 'en-US',
        currencySymbolPosition: 'before',
        currencySpaceBetweenAmountAndSymbol: false,
      }),
      'make-filters-from-conditions': async () => ({ filters: [] }),
      query: async () => ({ data: 1234, dependencies: [] }),
    });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(TestProviders, { store, children });
    const { result } = renderHook(
      () => useFormulaExecution('=ROUND(QUERY("Income"), 2)', { Income: {} }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.result).toBe(1.23));
  });

  it.each([
    ['spent', -0.234],
    ['goal', 3.456],
    ['balance_start', 1.234],
    ['balance_end', 2.234],
  ])('decodes the %s budget dimension at 3dp', async (dimension, expected) => {
    const store = createTestAppStore();
    store.dispatch(
      mergeSyncedPrefs({
        amountEncoding: JSON.stringify({
          version: 1,
          currencyCode: 'KWD',
          precision: 3,
        }),
      }),
    );
    initServer({
      'formula-load-user-preferences': async () => ({
        currency: getCurrency('USD'),
        numberFormat: 'comma-dot',
        decimalPlaces: 2,
        thousandsSeparator: ',',
        decimalSeparator: '.',
        locale: 'en-US',
        currencySymbolPosition: 'before',
        currencySpaceBetweenAmountAndSymbol: false,
      }),
      'envelope-budget-month': async ({ month }) =>
        month === '2025-12'
          ? [
              { name: 'leftover-cat-a', value: 1234 },
              { name: 'carryover-cat-a', value: true },
            ]
          : [
              { name: 'budget-cat-a', value: 1234 },
              { name: 'sum-amount-cat-a', value: -234 },
              { name: 'goal-cat-a', value: 3456 },
            ],
    });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(TestProviders, { store, children });
    const { result } = renderHook(
      () =>
        useFormulaExecution(
          `=BUDGET_QUERY("${dimension}", "cat-a", "2026-01", "2026-01")`,
          {},
        ),
      { wrapper },
    );
    await waitFor(() => expect(result.current.result).toBe(expected));
    await clearServer();
  });

  it('treats invalid and empty prefetch amounts as zero', async () => {
    initServer({
      'formula-load-user-preferences': async () => ({
        currency: getCurrency('USD'),
        numberFormat: 'comma-dot',
        decimalPlaces: 2,
        thousandsSeparator: ',',
        decimalSeparator: '.',
        locale: 'en-US',
        currencySymbolPosition: 'before',
        currencySpaceBetweenAmountAndSymbol: false,
      }),
      'make-filters-from-conditions': async () => ({ filters: [] }),
      query: async () => ({ data: Infinity, dependencies: [] }),
      'envelope-budget-month': async () => [
        { name: 'budget-cat-a', value: 'bad' },
      ],
    });
    const formulas = [
      ['=QUERY("Income")', { Income: {} }, undefined],
      ['=BALANCE_OF("account")', {}, [{ id: 'account', name: 'Checking' }]],
      [
        '=BUDGET_QUERY("budgeted", "cat-a", "2026-01", "2026-01")',
        {},
        undefined,
      ],
    ] as const;
    for (const [formula, queries, accounts] of formulas) {
      const { result, unmount } = renderHook(
        () =>
          useFormulaExecution(
            formula,
            queries,
            0,
            undefined,
            accounts ? [...accounts] : undefined,
          ),
        { wrapper: TestProviders },
      );
      await waitFor(() => expect(result.current.result).toBe(0));
      unmount();
    }
  });
});
