import { useEffect, useRef, useState } from 'react';

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

  if (target.kind === 'ungrouped') {
    if (draggedAccount.closed) {
      return null;
    }
    const sideAccounts = accounts.filter(
      account =>
        !account.closed && account.offbudget === draggedAccount.offbudget,
    );
    const isGrouped = getEffectiveGroupId(draggedAccount, liveGroupIds) != null;
    if (!isGrouped && sideAccounts[0]?.id === draggedId) {
      return null;
    }
    const firstOther = sideAccounts.find(account => account.id !== draggedId);
    return {
      id: draggedId,
      targetId: firstOther?.id ?? null,
      accountGroupId: isGrouped ? null : undefined,
    };
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

export function dropZoneId(
  side: 'on' | 'off',
  groupId: AccountGroupEntity['id'] | null,
): string {
  return `${side}:${groupId ?? ''}`;
}

export function shouldHighlightDropZone({
  draggedZoneId,
  hoveredZoneId,
  zoneId,
}: {
  draggedZoneId: string | undefined;
  hoveredZoneId: string | undefined;
  zoneId: string;
}): boolean {
  return (
    draggedZoneId !== undefined &&
    hoveredZoneId === zoneId &&
    draggedZoneId !== zoneId
  );
}

type ActiveDropTarget = {
  targetId: string;
  zoneId: string | undefined;
  pos: DropPosition;
};

const DRAG_IDLE_CLEAR_MS = 600;

export function useAccountReorder({
  isDragDisabled,
}: {
  isDragDisabled: boolean;
}): {
  canDrag: boolean;
  isDragging: boolean;
  onDragChange: OnDragChangeCallback<{ id: string }>;
  onDrop: OnDropCallback;
  onListDragOver: () => void;
  onDropTargetOver: (
    targetId: string,
    zoneId: string | undefined,
    pos: DropPosition,
  ) => void;
  activeDropPos: (targetId: string) => DropPosition | null;
  isDropZoneHighlighted: (zoneId: string) => boolean;
} {
  const { data: accounts = [] } = useAccounts();
  const { data: accountGroups = [] } = useAccountGroups();
  const moveAccount = useMoveAccountMutation();
  const [isDragging, setIsDragging] = useState(false);
  const [draggedZoneId, setDraggedZoneId] = useState<string | undefined>(
    undefined,
  );
  const [activeTarget, setActiveTarget] = useState<ActiveDropTarget | null>(
    null,
  );
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearIdleTimer = () => {
    if (idleTimer.current != null) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  };

  useEffect(() => clearIdleTimer, []);

  const onDragChange: OnDragChangeCallback<{ id: string }> = drag => {
    setIsDragging(drag.state === 'start');
    if (drag.state === 'start-preview' && drag.item != null) {
      const draggedAccount = accounts.find(
        account => account.id === drag.item?.id,
      );
      setDraggedZoneId(
        draggedAccount == null || draggedAccount.closed
          ? undefined
          : dropZoneId(
              draggedAccount.offbudget ? 'off' : 'on',
              getEffectiveGroupId(
                draggedAccount,
                new Set(accountGroups.map(group => group.id)),
              ),
            ),
      );
    }
    if (drag.state === 'end') {
      clearIdleTimer();
      setDraggedZoneId(undefined);
      setActiveTarget(null);
    }
  };

  const onListDragOver = () => {
    clearIdleTimer();
    idleTimer.current = setTimeout(() => {
      idleTimer.current = null;
      setActiveTarget(null);
    }, DRAG_IDLE_CLEAR_MS);
  };

  const onDropTargetOver = (
    targetId: string,
    zoneId: string | undefined,
    pos: DropPosition,
  ) => {
    setActiveTarget(current =>
      current?.targetId === targetId && current.pos === pos
        ? current
        : { targetId, zoneId, pos },
    );
  };

  const activeDropPos = (targetId: string) =>
    activeTarget?.targetId === targetId ? activeTarget.pos : null;

  const isDropZoneHighlighted = (zoneId: string) =>
    shouldHighlightDropZone({
      draggedZoneId,
      hoveredZoneId: activeTarget?.zoneId,
      zoneId,
    });

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

  return {
    canDrag: !isDragDisabled,
    isDragging,
    onDragChange,
    onDrop,
    onListDragOver,
    onDropTargetOver,
    activeDropPos,
    isDropZoneHighlighted,
  };
}
