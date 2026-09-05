import { useState } from 'react';

import type {
  AccountEntity,
  AccountGroupEntity,
} from '@actual-app/core/types/models';

import { useMoveAccountMutation } from '#accounts';
import { useAccountGroups } from '#hooks/useAccountGroups';
import { useAccounts } from '#hooks/useAccounts';
import type {
  DropPosition,
  OnDragChangeCallback,
  OnDropCallback,
} from '#hooks/useDragDrop';

import { parseDropTarget } from './dropTargets';
import type { SidebarDropTarget } from './dropTargets';
import { getEffectiveGroupId } from './useSidebarAccountTree';

export type AccountMove = {
  id: AccountEntity['id'];
  targetId: AccountEntity['id'] | null;
  accountGroupId?: AccountGroupEntity['id'] | null;
};

export function computeAccountMove({
  accounts,
  liveGroupIds,
  draggedId,
  dropPos,
  target,
}: {
  accounts: AccountEntity[];
  liveGroupIds: ReadonlySet<AccountGroupEntity['id']>;
  draggedId: AccountEntity['id'];
  dropPos: DropPosition;
  target: SidebarDropTarget;
}): AccountMove | null {
  const draggedAccount = accounts.find(account => account.id === draggedId);
  if (draggedAccount == null) {
    return null;
  }

  if (target.kind === 'group') {
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
        getEffectiveGroupId(draggedAccount, liveGroupIds) === target.groupId
          ? undefined
          : target.groupId,
    };
  }

  let targetId: AccountEntity['id'] | null = target.accountId;
  if (dropPos === 'after') {
    const idx = accounts.findIndex(account => account.id === target.accountId);
    targetId =
      idx >= 0 && idx + 1 < accounts.length ? accounts[idx + 1].id : null;
  }

  let accountGroupId: AccountGroupEntity['id'] | null | undefined;
  const targetAccount = accounts.find(
    account => account.id === target.accountId,
  );
  if (!draggedAccount.closed && targetAccount != null) {
    const targetGroupId = getEffectiveGroupId(targetAccount, liveGroupIds);
    if (targetGroupId !== getEffectiveGroupId(draggedAccount, liveGroupIds)) {
      accountGroupId = targetGroupId;
    }
  }

  return { id: draggedId, targetId, accountGroupId };
}

export function useAccountReorder({
  isDragDisabled,
}: {
  isDragDisabled: boolean;
}): {
  canDrag: boolean;
  isDragging: boolean;
  onDragChange: OnDragChangeCallback<{ id: string }>;
  onDrop: OnDropCallback;
} {
  const { data: accounts = [] } = useAccounts();
  const { data: accountGroups = [] } = useAccountGroups();
  const moveAccount = useMoveAccountMutation();
  const [isDragging, setIsDragging] = useState(false);

  const onDragChange: OnDragChangeCallback<{ id: string }> = drag => {
    setIsDragging(drag.state === 'start');
  };

  const onDrop: OnDropCallback = (id, dropPos, targetId) => {
    const target = parseDropTarget(targetId);
    if (target == null) {
      return;
    }

    const move = computeAccountMove({
      accounts,
      liveGroupIds: new Set(accountGroups.map(group => group.id)),
      draggedId: id,
      dropPos,
      target,
    });
    if (move != null) {
      moveAccount.mutate(move);
    }
  };

  return { canDrag: !isDragDisabled, isDragging, onDragChange, onDrop };
}
