import { describe, it, expect } from 'vitest';

import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';

import {
  computeViewCategoryNewOrder,
  computeViewGroupNewOrder,
} from '@desktop-client/components/budget/orderUtils';

describe('orderUtils', () => {
  it('computes category new order for a view when moving between groups', () => {
    const grouped = [
      { id: 'g1', categories: [{ id: 'c1' }, { id: 'c2' }] },
      { id: 'g2', categories: [{ id: 'c3' }, { id: 'c4' }] },
    ] as CategoryGroupEntity[];
    const list = [
      { id: 'c1' },
      { id: 'c2' },
      { id: 'c3' },
      { id: 'c4' },
    ] as CategoryEntity[];

    const viewMap: Record<string, string[]> = {
      c1: ['v1'],
      c2: ['v1'],
      c3: ['v1'],
      c4: [],
    };

    // Move c2 into g2 before c3
    const newOrder = computeViewCategoryNewOrder(
      grouped,
      list,
      { id: 'c2', groupId: 'g2', targetId: 'c3' },
      'v1',
      viewMap,
    );

    // After move, flattened order = [c1, c2, c3, c4] => filtered by view => [c1,c2,c3]
    expect(newOrder).toEqual(['c1', 'c2', 'c3']);
  });

  it('computes group new order for a view when moving groups', () => {
    const grouped = [
      { id: 'g1', categories: [{ id: 'a' }] },
      { id: 'g2', categories: [{ id: 'b' }] },
      { id: 'g3', categories: [{ id: 'c' }] },
    ] as CategoryGroupEntity[];

    const viewMap: Record<string, string[]> = {
      a: ['v1'],
      b: [],
      c: ['v1'],
    };

    // Move g3 before g1
    const newOrder = computeViewGroupNewOrder(
      grouped,
      { id: 'g3', targetId: 'g1' },
      'v1',
      viewMap,
    );

    // After move: [g3,g1,g2] -> filter to groups that have categories in view v1 => g3 and g1
    expect(newOrder).toEqual(['g3', 'g1']);
  });
});
