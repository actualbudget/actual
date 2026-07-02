import * as connection from '@actual-app/core/platform/client/connection';
import type {
  RuleConditionEntity,
  TimeFrame,
} from '@actual-app/core/types/models';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';

import { useFormulaExecution } from './useFormulaExecution';

type SerializedQuery = {
  filterExpressions: Array<Record<string, unknown>>;
  tableOptions: Record<string, unknown>;
};

type QueryConfig = {
  conditions?: RuleConditionEntity[];
  conditionsOp?: 'and' | 'or';
  timeFrame?: TimeFrame;
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
  const query = findQueryByCategory(queryPayloads, categoryId);
  expect(query.tableOptions).toMatchObject({ splits: 'grouped' });
  expect(query.filterExpressions[0]).toEqual({
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

describe('useFormulaExecution', () => {
  const previousIsTesting = global.IS_TESTING;
  const dateNow = global.Date.now;
  let queryPayloads: SerializedQuery[];

  beforeEach(() => {
    queryPayloads = [];
    global.IS_TESTING = false;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.spyOn(connection, 'send').mockImplementation(async (name, args) => {
      switch (name) {
        case 'formula-load-user-preferences':
          return undefined;
        case 'make-filters-from-conditions':
          return {
            filters: (
              (args as { conditions?: RuleConditionEntity[] }).conditions ?? []
            ).map(condition => ({
              [condition.field]: condition.value,
            })),
          };
        case 'query':
          queryPayloads.push(args as SerializedQuery);
          return { data: queryPayloads.length * 100, dependencies: [] };
        default:
          throw new Error(`Unexpected command: ${name}`);
      }
    });
  });

  afterEach(() => {
    global.IS_TESTING = previousIsTesting;
    vi.useRealTimers();
    global.Date.now = dateNow;
    vi.restoreAllMocks();
  });

  async function executeFormulaAt(
    date: string,
    queries: Record<string, QueryConfig>,
  ) {
    queryPayloads = [];
    vi.setSystemTime(new Date(date));

    const { result, unmount } = renderHook(
      () =>
        useFormulaExecution('=QUERY("Income") + QUERY("Expenses")', queries, 0),
      { wrapper: TestProviders },
    );

    await waitFor(() => expect(result.current.result).toBe(3));
    unmount();

    return [...queryPayloads];
  }

  it('shifts each formula report query window when the current month changes', async () => {
    const juneQueries = await executeFormulaAt(
      '2026-06-15T12:00:00',
      formulaQueries,
    );

    expectQueryDateRange(juneQueries, 'income-cat', '2026-04-01', '2026-06-15');
    expectQueryDateRange(
      juneQueries,
      'expense-cat',
      '2026-06-01',
      '2026-06-15',
    );

    const julyQueries = await executeFormulaAt(
      '2026-07-15T12:00:00',
      formulaQueries,
    );

    expectQueryDateRange(julyQueries, 'income-cat', '2026-05-01', '2026-07-15');
    expectQueryDateRange(
      julyQueries,
      'expense-cat',
      '2026-07-01',
      '2026-07-15',
    );
  });
});
