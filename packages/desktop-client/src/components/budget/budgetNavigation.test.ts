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
  hidden = false,
): CategoryGroupEntity & {
  id: string;
  categories: CategoryEntity[];
  hidden?: boolean;
} {
  return {
    id,
    name: id,
    categories,
    hidden,
  } as CategoryGroupEntity & {
    id: string;
    categories: CategoryEntity[];
    hidden?: boolean;
  };
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
      false,
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
      false,
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
      false,
      { id: 'cat-b', cell: '2026-08' },
      'tracking',
      1,
    );

    expect(nextCell).toEqual({ id: 'cat-income', cell: '2026-08' });
  });

  it('skips hidden expense groups when hidden categories are not shown', () => {
    const nextCell = findNextBudgetCell(
      [
        makeGroup('group-a', [makeCategory('cat-a')]),
        makeGroup('group-hidden', [makeCategory('cat-hidden')], true),
        makeGroup('group-b', [makeCategory('cat-b')]),
      ],
      [],
      false,
      { id: 'cat-a', cell: '2026-08' },
      'envelope',
      1,
    );

    expect(nextCell).toEqual({ id: 'cat-b', cell: '2026-08' });
  });

  it('skips hidden categories while preserving collapsed groups', () => {
    const nextCell = findNextBudgetCell(
      [
        makeGroup('group-a', [
          makeCategory('cat-a'),
          Object.assign(makeCategory('cat-hidden'), { hidden: true }),
        ]),
        makeGroup('group-b', [
          makeCategory('cat-b-1'),
          makeCategory('cat-b-2'),
        ]),
        makeGroup('group-c', [makeCategory('cat-c')]),
      ],
      ['group-b'],
      false,
      { id: 'cat-a', cell: '2026-08' },
      'envelope',
      1,
    );

    expect(nextCell).toEqual({ id: 'cat-c', cell: '2026-08' });
  });
});
