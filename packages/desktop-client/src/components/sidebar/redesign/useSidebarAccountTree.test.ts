import { generateAccount } from '@actual-app/core/mocks';
import type {
  AccountEntity,
  AccountGroupEntity,
} from '@actual-app/core/types/models';
import { describe, expect, it } from 'vitest';

import {
  buildAccountSide,
  filterSidebarTree,
  getEffectiveGroupId,
} from './useSidebarAccountTree';
import type { SidebarAccountTree } from './useSidebarAccountTree';

function makeAccount(
  name: string,
  overrides: Partial<AccountEntity> = {},
): AccountEntity {
  return { ...generateAccount(name), ...overrides };
}

function makeGroup(id: string, name: string): AccountGroupEntity {
  return { id, name, sort_order: 0 };
}

describe('getEffectiveGroupId', () => {
  it('returns the group id only when the group is live', () => {
    const liveGroupIds = new Set(['g1']);
    expect(
      getEffectiveGroupId(
        makeAccount('A', { account_group_id: 'g1' }),
        liveGroupIds,
      ),
    ).toBe('g1');
    expect(
      getEffectiveGroupId(
        makeAccount('B', { account_group_id: 'deleted' }),
        liveGroupIds,
      ),
    ).toBeNull();
    expect(
      getEffectiveGroupId(
        makeAccount('C', { account_group_id: null }),
        liveGroupIds,
      ),
    ).toBeNull();
  });
});

describe('buildAccountSide', () => {
  it('buckets ungrouped and dangling-ref accounts first, then groups in order', () => {
    const groups = [makeGroup('g1', 'Savings'), makeGroup('g2', 'Cards')];
    const accounts = [
      makeAccount('Loose'),
      makeAccount('Dangling', { account_group_id: 'deleted' }),
      makeAccount('Saver', { account_group_id: 'g1' }),
      makeAccount('Amex', { account_group_id: 'g2' }),
    ];

    const side = buildAccountSide(accounts, groups);

    expect(side.accountCount).toBe(4);
    expect(side.buckets.map(bucket => bucket.group?.id ?? null)).toEqual([
      null,
      'g1',
      'g2',
    ]);
    expect(side.buckets[0].accounts.map(account => account.name)).toEqual([
      'Loose',
      'Dangling',
    ]);
  });

  it('omits empty buckets and counts failed syncs per bucket', () => {
    const groups = [makeGroup('g1', 'Savings'), makeGroup('g2', 'Empty')];
    const failed = makeAccount('Broken', {
      account_group_id: 'g1',
      bank_sync_status: 'reauth-required',
    });
    const side = buildAccountSide(
      [makeAccount('Fine', { account_group_id: 'g1' }), failed],
      groups,
    );

    expect(side.buckets.map(bucket => bucket.group?.id)).toEqual(['g1']);
    expect(side.buckets[0].failedCount).toBe(1);
    expect(side.failedCount).toBe(1);
  });
});

describe('filterSidebarTree', () => {
  const groups = [makeGroup('g1', 'Savings')];
  const tree: SidebarAccountTree = {
    onBudget: buildAccountSide(
      [
        makeAccount('Checking'),
        makeAccount('Premium Saver', { account_group_id: 'g1' }),
      ],
      groups,
    ),
    offBudget: buildAccountSide([makeAccount('House')], groups),
    closed: [makeAccount('Old Checking', { closed: 1 })],
  };

  it('returns the tree unchanged for an empty query', () => {
    expect(filterSidebarTree(tree, '')).toBe(tree);
  });

  it('filters rows but keeps side counts for the full side', () => {
    const filtered = filterSidebarTree(tree, 'saver');

    expect(
      filtered.onBudget.buckets.flatMap(bucket =>
        bucket.accounts.map(account => account.name),
      ),
    ).toEqual(['Premium Saver']);
    expect(filtered.onBudget.accountCount).toBe(2);
    expect(filtered.offBudget.buckets).toEqual([]);
    expect(filtered.closed).toEqual([]);
  });

  it('matches closed accounts too', () => {
    const filtered = filterSidebarTree(tree, 'old');
    expect(filtered.closed.map(account => account.name)).toEqual([
      'Old Checking',
    ]);
  });
});
