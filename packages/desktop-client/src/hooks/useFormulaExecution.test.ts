import {
  clearServer,
  initServer,
} from '@actual-app/core/platform/client/connection';
import { getCurrency } from '@actual-app/core/shared/currencies';
import type {
  RuleConditionEntity,
  TimeFrame,
} from '@actual-app/core/types/models';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';

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
