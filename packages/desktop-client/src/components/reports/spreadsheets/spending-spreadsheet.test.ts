import { initServer } from '@actual-app/core/platform/client/connection';
import type { QueryState } from '@actual-app/core/shared/query';
import type {
  CategoryEntity,
  CategoryGroupEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SpreadsheetProvider, useSpreadsheet } from '#hooks/useSpreadsheet';

import {
  createSpendingSpreadsheet,
  getSpendingBudgetFilters,
} from './spending-spreadsheet';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const categoryGroups = [
  { id: 'group-bills', name: 'Bills' },
  { id: 'group-fun', name: 'Fun Money' },
] satisfies CategoryGroupEntity[];

const categories = [
  { id: 'cat-rent', name: 'Rent', group: 'group-bills' },
  { id: 'cat-electric', name: 'Electric', group: 'group-bills' },
  { id: 'cat-dining', name: 'Dining Out', group: 'group-fun' },
  { id: 'cat-salary', name: 'Salary', group: 'group-income', is_income: true },
] satisfies CategoryEntity[];

describe('getSpendingBudgetFilters', () => {
  it('filters budget categories by category group', () => {
    const result = getSpendingBudgetFilters({
      categories,
      categoryGroups,
      conditions: [
        {
          field: 'category_group',
          op: 'is',
          value: 'group-bills',
        },
      ] satisfies RuleConditionEntity[],
    });

    expect(result).toEqual([
      { category: { $oneof: ['cat-rent', 'cat-electric'] } },
    ]);
  });

  it('excludes income even when no category condition is present', () => {
    const result = getSpendingBudgetFilters({
      categories,
      categoryGroups,
      conditions: [
        {
          field: 'account',
          op: 'is',
          value: 'account-checking',
        },
      ] satisfies RuleConditionEntity[],
    });

    expect(result).toEqual([
      { category: { $oneof: ['cat-rent', 'cat-electric', 'cat-dining'] } },
    ]);
  });

  it('excludes income from an explicit category selection', () => {
    expect(
      getSpendingBudgetFilters({
        categories,
        categoryGroups,
        conditions: [
          { field: 'category', op: 'oneOf', value: ['cat-rent', 'cat-salary'] },
        ],
      }),
    ).toEqual([{ category: { $oneof: ['cat-rent'] } }]);
  });

  it('keeps income-only selections empty instead of including all budgets', () => {
    expect(
      getSpendingBudgetFilters({
        categories,
        categoryGroups,
        conditions: [{ field: 'category', op: 'is', value: 'cat-salary' }],
      }),
    ).toEqual([{ category: { $oneof: [] } }]);
  });

  it('excludes income while preserving category filters combined with or', () => {
    expect(
      getSpendingBudgetFilters({
        categories,
        categoryGroups,
        conditionsOp: 'or',
        conditions: [
          { field: 'category_group', op: 'is', value: 'group-bills' },
          { field: 'category', op: 'is', value: 'cat-salary' },
        ],
      }),
    ).toEqual([{ category: { $oneof: ['cat-rent', 'cat-electric'] } }]);
  });

  it('filters budget categories by direct category IDs', () => {
    const result = getSpendingBudgetFilters({
      categories,
      categoryGroups,
      conditions: [
        {
          field: 'category',
          op: 'oneOf',
          value: ['cat-rent', 'cat-dining'],
        },
      ] satisfies RuleConditionEntity[],
    });

    expect(result).toEqual([
      { category: { $oneof: ['cat-rent', 'cat-dining'] } },
    ]);
  });
});
describe('createSpendingSpreadsheet', () => {
  it.each(['tracking', 'envelope'] as const)(
    'limits the unfiltered %s budget query to expense categories',
    async budgetType => {
      const queries: QueryState[] = [];
      initServer({
        'make-filters-from-conditions': async () => ({ filters: [] }),
        'get-categories': async () => ({
          list: categories,
          grouped: categoryGroups,
        }),
        query: async query => {
          queries.push(query);
          return { data: [], dependencies: [] };
        },
      });
      const setData = vi.fn();
      const { result, unmount } = renderHook(useSpreadsheet, {
        wrapper: SpreadsheetProvider,
      });
      await createSpendingSpreadsheet({
        budgetType,
        compare: '2026-01',
        compareTo: '2025-12',
      })(result.current, setData);
      unmount();

      const budgetQuery = queries.find(
        query =>
          query.table ===
          (budgetType === 'tracking' ? 'reflect_budgets' : 'zero_budgets'),
      );
      expect(budgetQuery?.filterExpressions).toEqual([
        {
          $and: [
            { month: { $eq: 202601 } },
            {
              category: { $oneof: ['cat-rent', 'cat-electric', 'cat-dining'] },
            },
          ],
        },
      ]);
      expect(setData).toHaveBeenCalledOnce();
    },
  );
});
