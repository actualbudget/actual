import { describe, expect, it } from 'vitest';
import type {
  CategoryEntity,
  CategoryGroupEntity,
  RuleConditionEntity,
} from '@actual-app/core/types/models';

import { filterCategoriesByConditions } from './budgetDataQuery';

const categoryGroups = [
  { id: 'group-bills', name: 'Bills' },
  { id: 'group-fun', name: 'Fun Money' },
  { id: 'group-savings', name: 'Savings' },
] as CategoryGroupEntity[];

const categories = [
  { id: 'cat-rent', name: 'Rent', group: 'group-bills' },
  { id: 'cat-electric', name: 'Electric', group: 'group-bills' },
  { id: 'cat-dining', name: 'Dining Out', group: 'group-fun' },
  { id: 'cat-emergency', name: 'Emergency Fund', group: 'group-savings' },
] as CategoryEntity[];

describe('filterCategoriesByConditions', () => {
  it('filters budget categories by category group', () => {
    const result = filterCategoriesByConditions(
      categories,
      categoryGroups,
      [
        {
          field: 'category_group',
          op: 'is',
          value: 'group-bills',
        } as RuleConditionEntity,
      ],
      'and',
    );

    expect(result.map(category => category.id)).toEqual([
      'cat-rent',
      'cat-electric',
    ]);
  });

  it('supports selecting one of multiple category groups', () => {
    const result = filterCategoriesByConditions(
      categories,
      categoryGroups,
      [
        {
          field: 'category_group',
          op: 'oneOf',
          value: ['group-fun', 'group-savings'],
        } as RuleConditionEntity,
      ],
      'and',
    );

    expect(result.map(category => category.id)).toEqual([
      'cat-dining',
      'cat-emergency',
    ]);
  });

  it('combines category and category group filters with and', () => {
    const result = filterCategoriesByConditions(
      categories,
      categoryGroups,
      [
        {
          field: 'category_group',
          op: 'is',
          value: 'group-bills',
        } as RuleConditionEntity,
        {
          field: 'category',
          op: 'is',
          value: 'cat-rent',
        } as RuleConditionEntity,
      ],
      'and',
    );

    expect(result.map(category => category.id)).toEqual(['cat-rent']);
  });

  it('matches text operators against category group names', () => {
    const result = filterCategoriesByConditions(
      categories,
      categoryGroups,
      [
        {
          field: 'category_group',
          op: 'contains',
          value: 'fun',
        } as RuleConditionEntity,
      ],
      'and',
    );

    expect(result.map(category => category.id)).toEqual(['cat-dining']);
  });
});
