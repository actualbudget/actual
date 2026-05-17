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
] as CategoryGroupEntity[];

const categories = [
  { id: 'cat-rent', name: 'Rent', group: 'group-bills' },
  { id: 'cat-electric', name: 'Electric', group: 'group-bills' },
  { id: 'cat-dining', name: 'Dining Out', group: 'group-fun' },
] as CategoryEntity[];

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
        } as RuleConditionEntity,
      ],
    });

    expect(result).toEqual([
      { category: { $oneof: ['cat-rent', 'cat-electric'] } },
    ]);
  });

  it('does not filter budgets when no category condition is present', () => {
    const result = getSpendingBudgetFilters({
      categories,
      categoryGroups,
      conditions: [
        {
          field: 'account',
          op: 'is',
          value: 'account-checking',
        } as RuleConditionEntity,
      ],
    });

    expect(result).toEqual([]);
  });
});
