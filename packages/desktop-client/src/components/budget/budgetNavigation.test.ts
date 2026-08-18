import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';
import { describe, expect, it } from 'vitest';

import { findNextBudgetCell } from './budgetNavigation';

function makeCategory(
  id: string,
  is_income = false,
): CategoryEntity & { id: string; is_income: boolean } {
  return {
    id,
    name: id,
    is_income,
  } as CategoryEntity & { id: string; is_income: boolean };
}

function makeGroup(
  id: string,
  categories: CategoryEntity[],
): CategoryGroupEntity & { id: string; categories: CategoryEntity[] } {
  return {
    id,
    name: id,
    categories,
  } as CategoryGroupEntity & { id: string; categories: CategoryEntity[] };
}

describe('findNextBudgetCell', () => {
  const expenseGroups = [
    makeGroup('group-a', [makeCategory('cat-a'), makeCategory('cat-b')]),
    makeGroup('income-group', [makeCategory('cat-income', true)]),
  ];

  it('moves to the next expense category without reopening edit mode', () => {
    const nextCell = findNextBudgetCell(
      expenseGroups,
      [],
      { id: 'cat-a', cell: '2026-08' },
      'envelope',
      1,
    );

    expect(nextCell).toEqual({ id: 'cat-b', cell: '2026-08' });
  });

  it('skips income categories when navigating envelope budgets', () => {
    const nextCell = findNextBudgetCell(
      expenseGroups,
      [],
      { id: 'cat-b', cell: '2026-08' },
      'envelope',
      1,
    );

    expect(nextCell).toBeNull();
  });

  it('allows moving into income categories for tracking budgets', () => {
    const nextCell = findNextBudgetCell(
      expenseGroups,
      [],
      { id: 'cat-b', cell: '2026-08' },
      'tracking',
      1,
    );

    expect(nextCell).toEqual({ id: 'cat-income', cell: '2026-08' });
  });
});
