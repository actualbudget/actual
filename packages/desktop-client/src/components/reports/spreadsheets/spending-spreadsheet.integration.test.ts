import {
  clearServer,
  initServer,
} from '@actual-app/core/platform/client/connection';
import { renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { SpreadsheetProvider, useSpreadsheet } from '#hooks/useSpreadsheet';

import { createSpendingSpreadsheet } from './spending-spreadsheet';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

afterEach(async () => {
  await clearServer();
});

it('excludes income from the tracking spending budget query', async () => {
  let budgetQueryCalled = false;

  initServer({
    'make-filters-from-conditions': async () => ({ filters: [] }),
    'get-categories': async () => ({
      list: [
        {
          id: 'cat-food',
          name: 'Food',
          group: 'group-expenses',
          is_income: false,
        },
        {
          id: 'cat-income',
          name: 'Salary',
          group: 'group-income',
          is_income: true,
        },
      ],
      grouped: [
        { id: 'group-expenses', name: 'Expenses' },
        { id: 'group-income', name: 'Income' },
      ],
    }),
    query: async query => {
      if (query.table !== 'reflect_budgets') {
        return { data: [], dependencies: [] };
      }

      budgetQueryCalled = true;

      expect(query.filterExpressions).toContainEqual({
        $and: [
          { month: { $eq: 202609 } },
          { category: { $oneof: ['cat-food'] } },
        ],
      });

      return {
        data: [{ category: 'cat-food', amount: 10000 }],
        dependencies: [],
      };
    },
  });

  const { result } = renderHook(useSpreadsheet, {
    wrapper: SpreadsheetProvider,
  });

  let finalBudget: number | undefined;

  await createSpendingSpreadsheet({
    budgetType: 'tracking',
    compare: '2026-09',
    compareTo: '2026-08',
    conditions: [],
  })(result.current, data => {
    finalBudget = data.intervalData.at(-1)?.budget;
  });

  expect(budgetQueryCalled).toBe(true);
  expect(finalBudget).toBe(-10000);
});
