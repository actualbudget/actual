import type {
  AccountEntity,
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';
import { describe, expect, it, vi } from 'vitest';

import { showActivity } from './showActivity';

const categories: { grouped: CategoryGroupEntity[]; list: CategoryEntity[] } = {
  grouped: [],
  list: [],
};
const accounts: AccountEntity[] = [];

describe('showActivity', () => {
  it('adds a transfer filter for the virtual Transfers category', () => {
    const navigate = vi.fn();

    showActivity({
      navigate,
      categories,
      accounts,
      balanceTypeOp: 'totalAssets',
      filters: [{ field: 'account', op: 'is', value: 'acct-1', type: 'id' }],
      showHiddenCategories: true,
      showOffBudget: true,
      type: 'totals',
      startDate: '2026-05-24',
      endDate: '2026-05-30',
      field: 'category',
      id: '',
      uncategorizedId: 'transfer',
    });

    const [path, options] = navigate.mock.calls[0];
    const filterConditions = options.state.filterConditions;

    expect(path).toBe('/accounts');
    expect(filterConditions).toContainEqual({
      field: 'transfer',
      op: 'is',
      value: true,
      type: 'boolean',
    });
    expect(filterConditions).not.toContainEqual({
      field: 'category',
      op: 'is',
      value: '',
      type: 'id',
    });
  });

  it('adds a category group filter when drilling down by group', () => {
    const navigate = vi.fn();

    showActivity({
      navigate,
      categories,
      accounts,
      balanceTypeOp: 'totalAssets',
      filters: [],
      showHiddenCategories: true,
      showOffBudget: true,
      type: 'totals',
      startDate: '2026-05-24',
      endDate: '2026-05-30',
      field: 'group',
      id: 'group-usual',
    });

    const [path, options] = navigate.mock.calls[0];

    expect(path).toBe('/accounts');
    expect(options.state.filterConditions).toContainEqual({
      field: 'category_group',
      op: 'is',
      value: 'group-usual',
      type: 'id',
    });
  });

  it('omits the category group filter for the uncategorized group', () => {
    const navigate = vi.fn();

    showActivity({
      navigate,
      categories,
      accounts,
      balanceTypeOp: 'totalAssets',
      filters: [],
      showHiddenCategories: true,
      showOffBudget: true,
      type: 'totals',
      startDate: '2026-05-24',
      endDate: '2026-05-30',
      field: 'group',
      id: 'uncategorized',
      uncategorizedId: 'all',
    });

    const [, options] = navigate.mock.calls[0];

    expect(
      options.state.filterConditions.filter((f: { field: string }) =>
        ['category', 'category_group'].includes(f.field),
      ),
    ).toHaveLength(0);
  });

  it('keeps the category filter for regular categories', () => {
    const navigate = vi.fn();

    showActivity({
      navigate,
      categories,
      accounts,
      balanceTypeOp: 'totalAssets',
      filters: [],
      showHiddenCategories: true,
      showOffBudget: true,
      type: 'totals',
      startDate: '2026-05-24',
      endDate: '2026-05-30',
      field: 'category',
      id: 'cat-food',
    });

    const [, options] = navigate.mock.calls[0];

    expect(options.state.filterConditions).toContainEqual({
      field: 'category',
      op: 'is',
      value: 'cat-food',
      type: 'id',
    });
  });
});
