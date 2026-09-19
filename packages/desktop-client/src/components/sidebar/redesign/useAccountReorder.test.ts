import { generateAccount } from '@actual-app/core/mocks';
import type { AccountEntity } from '@actual-app/core/types/models';
import { describe, expect, it } from 'vitest';

import { dropTargets, parseDropTarget } from './dropTargets';
import {
  computeAccountMove,
  shouldHighlightDropZone,
} from './useAccountReorder';

function makeAccount(
  id: string,
  overrides: Partial<AccountEntity> = {},
): AccountEntity {
  return { ...generateAccount(id), id, name: id, ...overrides };
}

const liveGroupIds = new Set(['g1', 'g2']);

// Raw sort order: a (g1), b (g1), c (ungrouped), d (g2), off1, closed1
const accounts = [
  makeAccount('a', { account_group_id: 'g1' }),
  makeAccount('b', { account_group_id: 'g1' }),
  makeAccount('c'),
  makeAccount('d', { account_group_id: 'g2' }),
  makeAccount('off1', { offbudget: 1 }),
  makeAccount('closed1', { closed: 1 }),
];

function move(
  draggedId: string,
  dropPos: 'before' | 'after',
  targetId: string,
) {
  const target = parseDropTarget(targetId);
  if (target == null) {
    throw new Error(`unparseable drop target: ${targetId}`);
  }
  return computeAccountMove({
    accounts,
    liveGroupIds,
    draggedId,
    dropPos,
    target,
  });
}

describe('parseDropTarget', () => {
  it('round-trips account and group ids and rejects unknown ids', () => {
    expect(parseDropTarget(dropTargets.account('abc'))).toEqual({
      kind: 'account',
      accountId: 'abc',
    });
    expect(parseDropTarget(dropTargets.group('g1'))).toEqual({
      kind: 'group',
      groupId: 'g1',
    });
    expect(parseDropTarget(dropTargets.ungrouped('off'))).toEqual({
      kind: 'ungrouped',
      side: 'off',
    });
    expect(parseDropTarget('abc')).toBeNull();
    expect(parseDropTarget('ungrouped:sideways')).toBeNull();
  });
});

describe('computeAccountMove', () => {
  it('reorders within a group without touching the group', () => {
    expect(move('b', 'before', dropTargets.account('a'))).toEqual({
      id: 'b',
      targetId: 'a',
      accountGroupId: undefined,
    });
  });

  it('inserts before the raw successor when dropping after a row', () => {
    expect(move('a', 'after', dropTargets.account('b'))).toEqual({
      id: 'a',
      targetId: 'c',
      accountGroupId: undefined,
    });
  });

  it('appends at the end when dropping after the last account', () => {
    expect(move('a', 'after', dropTargets.account('closed1'))?.targetId).toBe(
      null,
    );
  });

  it('adopts the drop target row group, including ungrouped', () => {
    expect(move('a', 'before', dropTargets.account('d'))).toEqual({
      id: 'a',
      targetId: 'd',
      accountGroupId: 'g2',
    });
    expect(move('a', 'before', dropTargets.account('c'))).toEqual({
      id: 'a',
      targetId: 'c',
      accountGroupId: null,
    });
  });

  it('never reassigns groups for closed account drags', () => {
    expect(move('closed1', 'before', dropTargets.account('a'))).toEqual({
      id: 'closed1',
      targetId: 'a',
      accountGroupId: undefined,
    });
  });

  it('drops onto a group header before its first member on the same side', () => {
    expect(move('c', 'before', dropTargets.group('g1'))).toEqual({
      id: 'c',
      targetId: 'a',
      accountGroupId: 'g1',
    });
  });

  it('keeps the group untouched when dropping onto its own group header', () => {
    expect(move('b', 'before', dropTargets.group('g1'))).toEqual({
      id: 'b',
      targetId: 'a',
      accountGroupId: undefined,
    });
    expect(move('a', 'before', dropTargets.group('g1'))).toBeNull();
  });

  it('ignores drops onto headers of groups with no members on the side', () => {
    const offOnly = new Set(['g9']);
    expect(
      computeAccountMove({
        accounts,
        liveGroupIds: offOnly,
        draggedId: 'a',
        dropPos: 'before',
        target: { kind: 'group', groupId: 'g9' },
      }),
    ).toBeNull();
  });

  it('returns null for unknown dragged accounts', () => {
    expect(move('nope', 'before', dropTargets.account('a'))).toBeNull();
  });

  it('drops onto the side header to ungroup and move to the top of the side', () => {
    expect(move('b', 'before', dropTargets.ungrouped('on'))).toEqual({
      id: 'b',
      targetId: 'a',
      accountGroupId: null,
    });
    expect(move('a', 'before', dropTargets.ungrouped('on'))).toEqual({
      id: 'a',
      targetId: 'b',
      accountGroupId: null,
    });
  });

  it('moves a loose account to the top of the side without touching its group', () => {
    expect(move('c', 'before', dropTargets.ungrouped('on'))).toEqual({
      id: 'c',
      targetId: 'a',
      accountGroupId: undefined,
    });
  });

  it('ignores side header drops that would change nothing', () => {
    const looseFirst = [makeAccount('x'), ...accounts];
    expect(
      computeAccountMove({
        accounts: looseFirst,
        liveGroupIds,
        draggedId: 'x',
        dropPos: 'before',
        target: { kind: 'ungrouped', side: 'on' },
      }),
    ).toBeNull();
    expect(move('closed1', 'before', dropTargets.ungrouped('on'))).toBeNull();
  });
});

describe('shouldHighlightDropZone', () => {
  it('highlights a hovered group other than the one being dragged from', () => {
    expect(
      shouldHighlightDropZone({
        draggedZoneId: 'on:g1',
        hoveredZoneId: 'on:g2',
        zoneId: 'on:g2',
      }),
    ).toBe(true);
    expect(
      shouldHighlightDropZone({
        draggedZoneId: 'on:g1',
        hoveredZoneId: 'on:',
        zoneId: 'on:',
      }),
    ).toBe(true);
  });

  it('never highlights the group the account came from', () => {
    expect(
      shouldHighlightDropZone({
        draggedZoneId: 'on:g1',
        hoveredZoneId: 'on:g1',
        zoneId: 'on:g1',
      }),
    ).toBe(false);
    expect(
      shouldHighlightDropZone({
        draggedZoneId: 'on:',
        hoveredZoneId: 'on:',
        zoneId: 'on:',
      }),
    ).toBe(false);
  });

  it('highlights nothing outside a drag or for groups not hovered', () => {
    expect(
      shouldHighlightDropZone({
        draggedZoneId: undefined,
        hoveredZoneId: 'on:g2',
        zoneId: 'on:g2',
      }),
    ).toBe(false);
    expect(
      shouldHighlightDropZone({
        draggedZoneId: 'on:g1',
        hoveredZoneId: 'on:g2',
        zoneId: 'on:g3',
      }),
    ).toBe(false);
  });
});
