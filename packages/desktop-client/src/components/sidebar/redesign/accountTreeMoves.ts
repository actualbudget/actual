import type {
  AccountEntity,
  AccountGroupEntity,
} from '@actual-app/core/types/models';

import { getEffectiveGroupId } from './useSidebarAccountTree';

export type AccountMove = {
  id: AccountEntity['id'];
  targetId: AccountEntity['id'] | null;
  accountGroupId?: AccountGroupEntity['id'] | null;
};

export type GroupMove = {
  id: AccountGroupEntity['id'];
  targetId: AccountGroupEntity['id'] | null;
};

export type AccountDropTarget =
  | { kind: 'account'; accountId: string; position: 'before' | 'after' }
  | { kind: 'group'; groupId: string; position: 'on' | 'before' | 'after' };

export function computeAccountMove({
  accounts,
  liveGroupIds,
  draggedId,
  target,
}: {
  accounts: AccountEntity[];
  liveGroupIds: ReadonlySet<AccountGroupEntity['id']>;
  draggedId: AccountEntity['id'];
  target: AccountDropTarget;
}): AccountMove | null {
  const draggedAccount = accounts.find(account => account.id === draggedId);
  if (draggedAccount == null) {
    return null;
  }
  const draggedGroupId = getEffectiveGroupId(draggedAccount, liveGroupIds);

  if (target.kind === 'group' && target.position === 'on') {
    const firstMember = accounts.find(
      account =>
        !account.closed &&
        account.offbudget === draggedAccount.offbudget &&
        getEffectiveGroupId(account, liveGroupIds) === target.groupId,
    );
    if (firstMember == null || firstMember.id === draggedId) {
      return null;
    }
    return {
      id: draggedId,
      targetId: firstMember.id,
      accountGroupId:
        draggedGroupId === target.groupId ? undefined : target.groupId,
    };
  }

  if (target.kind === 'group') {
    if (draggedAccount.closed || draggedGroupId == null) {
      return null;
    }
    return { id: draggedId, targetId: null, accountGroupId: null };
  }

  let targetId: AccountEntity['id'] | null = target.accountId;
  if (target.position === 'after') {
    const siblings = accounts.filter(account =>
      draggedAccount.closed
        ? account.closed
        : account.offbudget === draggedAccount.offbudget,
    );
    const idx = siblings.findIndex(account => account.id === target.accountId);
    targetId =
      idx >= 0 && idx + 1 < siblings.length ? siblings[idx + 1].id : null;
  }

  let accountGroupId: AccountGroupEntity['id'] | null | undefined;
  const targetAccount = accounts.find(
    account => account.id === target.accountId,
  );
  if (!draggedAccount.closed && targetAccount != null) {
    const targetGroupId = getEffectiveGroupId(targetAccount, liveGroupIds);
    if (targetGroupId !== draggedGroupId) {
      accountGroupId = targetGroupId;
    }
  }

  return { id: draggedId, targetId, accountGroupId };
}

export function computeGroupMove({
  groups,
  draggedId,
  targetId,
  position,
}: {
  groups: AccountGroupEntity[];
  draggedId: AccountGroupEntity['id'];
  targetId: AccountGroupEntity['id'];
  position: 'before' | 'after';
}): GroupMove | null {
  if (draggedId === targetId) {
    return null;
  }
  if (position === 'before') {
    return { id: draggedId, targetId };
  }
  const idx = groups.findIndex(group => group.id === targetId);
  const next = idx >= 0 ? groups[idx + 1] : undefined;
  if (next?.id === draggedId) {
    return null;
  }
  return { id: draggedId, targetId: next?.id ?? null };
}
