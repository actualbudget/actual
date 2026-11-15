import type {
  AccountEntity,
  AccountGroupEntity,
} from '@actual-app/core/types/models';

import { getEffectiveGroupId } from './useSidebarAccountTree';

export type AccountMove = {
  id: AccountEntity['id'];
  targetId: AccountEntity['id'] | null;
  accountGroupId?: AccountGroupEntity['id'] | null;
  offBudget?: boolean;
};

export type GroupMove = {
  id: AccountGroupEntity['id'];
  targetId: AccountGroupEntity['id'] | null;
};

export type AccountDropTarget =
  | { kind: 'account'; accountId: string; position: 'before' | 'after' }
  | {
      kind: 'group';
      groupId: string;
      offBudget: boolean;
      position: 'on' | 'before' | 'after';
    };

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

  if (target.kind === 'group') {
    if (draggedAccount.closed) {
      return null;
    }
    const offBudget =
      target.offBudget === Boolean(draggedAccount.offbudget)
        ? undefined
        : target.offBudget;
    if (target.position !== 'on') {
      if (draggedGroupId == null && offBudget === undefined) {
        return null;
      }
      return { id: draggedId, targetId: null, accountGroupId: null, offBudget };
    }

    const firstMember = accounts.find(
      account =>
        !account.closed &&
        Boolean(account.offbudget) === target.offBudget &&
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
      offBudget,
    };
  }

  const targetAccount = accounts.find(
    account => account.id === target.accountId,
  );
  if (
    targetAccount == null ||
    targetAccount.id === draggedId ||
    draggedAccount.closed !== targetAccount.closed
  ) {
    return null;
  }

  let targetId: AccountEntity['id'] | null = target.accountId;
  if (target.position === 'after') {
    const siblings = accounts.filter(account =>
      targetAccount.closed
        ? account.closed
        : account.offbudget === targetAccount.offbudget,
    );
    const idx = siblings.findIndex(account => account.id === target.accountId);
    targetId =
      idx >= 0 && idx + 1 < siblings.length ? siblings[idx + 1].id : null;
  }

  let accountGroupId: AccountGroupEntity['id'] | null | undefined;
  let offBudget: boolean | undefined;
  if (!draggedAccount.closed) {
    const targetGroupId = getEffectiveGroupId(targetAccount, liveGroupIds);
    if (targetGroupId !== draggedGroupId) {
      accountGroupId = targetGroupId;
    }
    if (targetAccount.offbudget !== draggedAccount.offbudget) {
      offBudget = Boolean(targetAccount.offbudget);
    }
  }

  return { id: draggedId, targetId, accountGroupId, offBudget };
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
