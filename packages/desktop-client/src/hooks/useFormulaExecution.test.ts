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
