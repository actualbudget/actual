import { generateAccount } from '@actual-app/core/mocks';
import type {
  AccountEntity,
  AccountGroupEntity,
} from '@actual-app/core/types/models';
import { describe, expect, it } from 'vitest';

import { computeAccountMove, computeGroupMove } from './accountTreeMoves';
import type { AccountDropTarget } from './accountTreeMoves';
import { parseTreeKey, treeKeys } from './treeKeys';

function makeAccount(
  id: string,
  overrides: Partial<AccountEntity> = {},
): AccountEntity {
  return { ...generateAccount(id), id, name: id, ...overrides };
}

function makeGroup(id: string): AccountGroupEntity {
  return { id, name: id, sort_order: 0 };
}

const liveGroupIds = new Set(['g1', 'g2']);
const groups = [makeGroup('g1'), makeGroup('g2'), makeGroup('g3')];

// Raw sort order: a (g1), b (g1), c (ungrouped), d (g2), off1, closed1
const accounts = [
  makeAccount('a', { account_group_id: 'g1' }),
  makeAccount('b', { account_group_id: 'g1' }),
  makeAccount('c'),
  makeAccount('d', { account_group_id: 'g2' }),
  makeAccount('off1', { offbudget: 1 }),
  makeAccount('closed1', { closed: 1 }),
];

function move(draggedId: string, target: AccountDropTarget) {
  return computeAccountMove({ accounts, liveGroupIds, draggedId, target });
}

const before = (accountId: string): AccountDropTarget => ({
  kind: 'account',
  accountId,
  position: 'before',
});
const after = (accountId: string): AccountDropTarget => ({
  kind: 'account',
  accountId,
  position: 'after',
});
const groupDrop = (
  groupId: string,
  position: 'on' | 'before' | 'after' = 'on',
  offBudget = false,
): AccountDropTarget => ({ kind: 'group', groupId, offBudget, position });

describe('treeKeys', () => {
  it('round-trips account and group keys and rejects other keys', () => {
    expect(parseTreeKey(treeKeys.account('abc'))).toEqual({
      kind: 'account',
      accountId: 'abc',
    });
    expect(parseTreeKey(treeKeys.group('g1'))).toEqual({
      kind: 'group',
      groupId: 'g1',
    });
    expect(parseTreeKey('abc')).toBeNull();
    expect(parseTreeKey(12)).toBeNull();
  });
});

describe('computeAccountMove', () => {
  it('reorders within a group without touching the group', () => {
    expect(move('b', before('a'))).toEqual({
      id: 'b',
      targetId: 'a',
      accountGroupId: undefined,
    });
  });

  it('inserts before the next account on the same side when dropping after a row', () => {
    expect(move('a', after('b'))).toEqual({
      id: 'a',
      targetId: 'c',
      accountGroupId: undefined,
    });
  });

  it('skips accounts outside the sort partition when finding the successor', () => {
    const mixed = [
      makeAccount('on1'),
      makeAccount('off1', { offbudget: 1 }),
      makeAccount('on2'),
      makeAccount('on3'),
      makeAccount('closedA', { closed: 1 }),
      makeAccount('off2', { offbudget: 1 }),
      makeAccount('closedB', { closed: 1 }),
      makeAccount('closedC', { closed: 1 }),
    ];
    const moveMixed = (draggedId: string, target: AccountDropTarget) =>
      computeAccountMove({ accounts: mixed, liveGroupIds, draggedId, target });

    expect(moveMixed('on3', after('on1'))?.targetId).toBe('on2');
    expect(moveMixed('on1', after('on3'))?.targetId).toBe('closedA');
    expect(moveMixed('closedC', after('closedA'))?.targetId).toBe('closedB');
    expect(moveMixed('closedB', after('on3'))).toBeNull();
  });

  it('uses the destination partition when dropping before or after an account', () => {
    expect(move('a', before('off1'))).toEqual({
      id: 'a',
      targetId: 'off1',
      accountGroupId: null,
      offBudget: true,
    });
    expect(move('off1', after('b'))).toEqual({
      id: 'off1',
      targetId: 'c',
      accountGroupId: 'g1',
      offBudget: false,
    });
    expect(move('a', after('off1'))).toEqual({
      id: 'a',
      targetId: null,
      accountGroupId: null,
      offBudget: true,
    });
  });

  it('adopts the drop target row group, including ungrouped', () => {
    expect(move('a', before('d'))).toEqual({
      id: 'a',
      targetId: 'd',
      accountGroupId: 'g2',
    });
    expect(move('a', before('c'))).toEqual({
      id: 'a',
      targetId: 'c',
      accountGroupId: null,
    });
  });

  it('rejects account drops across the closed section boundary', () => {
    expect(move('closed1', before('a'))).toBeNull();
    expect(move('a', after('closed1'))).toBeNull();
  });

  it('drops onto a group before its first member on the same side', () => {
    expect(move('c', groupDrop('g1'))).toEqual({
      id: 'c',
      targetId: 'a',
      accountGroupId: 'g1',
    });
  });

  it('keeps the group untouched when dropping onto its own group', () => {
    expect(move('b', groupDrop('g1'))).toEqual({
      id: 'b',
      targetId: 'a',
      accountGroupId: undefined,
    });
    expect(move('a', groupDrop('g1'))).toBeNull();
  });

  it('finds the destination group members on the other budget side', () => {
    const offBudgetMember = makeAccount('off2', {
      offbudget: 1,
      account_group_id: 'g1',
    });
    expect(
      computeAccountMove({
        accounts: [...accounts, offBudgetMember],
        liveGroupIds,
        draggedId: 'a',
        target: groupDrop('g1', 'on', true),
      }),
    ).toEqual({
      id: 'a',
      targetId: 'off2',
      accountGroupId: undefined,
      offBudget: true,
    });
  });

  it('ignores drops onto groups with no members on the side', () => {
    expect(
      computeAccountMove({
        accounts,
        liveGroupIds: new Set(['g9']),
        draggedId: 'a',
        target: groupDrop('g9'),
      }),
    ).toBeNull();
  });

  it('ungroups to the end of the loose list when dropped beside a group', () => {
    expect(move('b', groupDrop('g2', 'before'))).toEqual({
      id: 'b',
      targetId: null,
      accountGroupId: null,
    });
    expect(move('c', groupDrop('g2', 'before'))).toBeNull();
    expect(move('closed1', groupDrop('g2', 'before'))).toBeNull();
  });

  it('moves an ungrouped account across budget sides when dropped beside a group', () => {
    expect(move('off1', groupDrop('g1', 'before'))).toEqual({
      id: 'off1',
      targetId: null,
      accountGroupId: null,
      offBudget: false,
    });
  });

  it('returns null for unknown dragged accounts', () => {
    expect(move('nope', before('a'))).toBeNull();
  });
});

describe('computeGroupMove', () => {
  it('moves a group before or after another group', () => {
    expect(
      computeGroupMove({
        groups,
        draggedId: 'g3',
        targetId: 'g1',
        position: 'before',
      }),
    ).toEqual({ id: 'g3', targetId: 'g1' });
    expect(
      computeGroupMove({
        groups,
        draggedId: 'g1',
        targetId: 'g2',
        position: 'after',
      }),
    ).toEqual({ id: 'g1', targetId: 'g3' });
    expect(
      computeGroupMove({
        groups,
        draggedId: 'g1',
        targetId: 'g3',
        position: 'after',
      }),
    ).toEqual({ id: 'g1', targetId: null });
  });

  it('ignores moves that change nothing', () => {
    expect(
      computeGroupMove({
        groups,
        draggedId: 'g1',
        targetId: 'g1',
        position: 'before',
      }),
    ).toBeNull();
    expect(
      computeGroupMove({
        groups,
        draggedId: 'g2',
        targetId: 'g1',
        position: 'after',
      }),
    ).toBeNull();
  });
});
