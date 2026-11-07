import type {
  CategoryEntity,
  CategoryGroupEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';
import { describe, expect, it } from 'vitest';

import { getSpendingBudgetFilters } from './spending-spreadsheet';

const categoryGroups = [
  { id: 'group-bills', name: 'Bills' },
  { id: 'group-fun', name: 'Fun Money' },
] satisfies CategoryGroupEntity[];

const categories = [
  { id: 'cat-rent', name: 'Rent', group: 'group-bills' },
  { id: 'cat-electric', name: 'Electric', group: 'group-bills' },
  { id: 'cat-dining', name: 'Dining Out', group: 'group-fun' },
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

  it('excludes income categories when no category condition is present', () => {
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
      {
        category: {
          $oneof: ['cat-rent', 'cat-electric', 'cat-dining'],
        },
      },
    ]);
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
  it('excludes income categories when no category filter is selected', () => {
    const result = getSpendingBudgetFilters({
      categories: [
        ...categories,
        {
          id: 'cat-income',
          name: 'Salary',
          group: 'group-income',
          is_income: true,
        },
      ],
      categoryGroups,
      conditions: [],
    });

    expect(result).toEqual([
      {
        category: {
          $oneof: ['cat-rent', 'cat-electric', 'cat-dining'],
        },
      },
    ]);
  });

  it('excludes income categories even when explicitly selected', () => {
    const result = getSpendingBudgetFilters({
      categories: [
        ...categories,
        {
          id: 'cat-income',
          name: 'Salary',
          group: 'group-income',
          is_income: true,
        },
      ],
      categoryGroups,
      conditions: [
        {
          field: 'category',
          op: 'oneOf',
          value: ['cat-rent', 'cat-income'],
        },
      ] satisfies RuleConditionEntity[],
    });

    expect(result).toEqual([
      {
        category: {
          $oneof: ['cat-rent'],
        },
      },
    ]);
  });
});
