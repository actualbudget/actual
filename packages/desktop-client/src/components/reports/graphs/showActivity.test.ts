import { vi } from 'vitest';
import type { NavigateFunction } from 'react-router';

import { categoryLists } from '#components/reports/ReportOptions';

import { showActivity } from './showActivity';

const categories = { list: [], grouped: [] };
const accounts = [];

function getFilterConditions(options: {
  field?: string;
  id?: string | string[];
}) {
  const navigate: NavigateFunction = vi.fn<NavigateFunction>();

  showActivity({
    navigate,
    categories,
    accounts,
    balanceTypeOp: 'totalAssets',
    filters: [],
    showHiddenCategories: true,
    showOffBudget: true,
    type: 'totals',
    startDate: '2026-05-01',
    endDate: '2026-05-31',
    ...options,
  });

  return navigate.mock.calls[0][1]?.state.filterConditions;
}

describe('showActivity', () => {
  it('uses a stable id for the Transfers pseudo-category', () => {
    const [categoryList] = categoryLists(categories);

    expect(
      categoryList.find(category => category.uncategorized_id === 'transfer')
        ?.id,
    ).toBe('transfer');
  });

  it('filters transfer drill-downs by transfer status', () => {
    const filterConditions = getFilterConditions({
      field: 'category',
      id: 'transfer',
    });

    expect(filterConditions).toContainEqual({
      field: 'transfer',
      op: 'is',
      value: true,
      type: 'boolean',
    });
    expect(filterConditions).not.toContainEqual(
      expect.objectContaining({ field: 'category', value: 'transfer' }),
    );
  });

  it('keeps regular category drill-down filters unchanged', () => {
    const filterConditions = getFilterConditions({
      field: 'category',
      id: 'food',
    });

    expect(filterConditions).toContainEqual({
      field: 'category',
      op: 'is',
      value: 'food',
      type: 'id',
    });
  });
});
