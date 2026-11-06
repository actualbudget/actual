import { useRef, useState } from 'react';
import type { DragItem } from 'react-aria';
import { DropIndicator, useDragAndDrop } from 'react-aria-components';
import type {
  DragTypes,
  DropTarget,
  ItemDropTarget,
} from 'react-aria-components';

import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import type {
  AccountEntity,
  AccountGroupEntity,
} from '@actual-app/core/types/models';
import { css } from '@emotion/css';

import { useMoveAccountGroupMutation } from '#account-groups';
import { useMoveAccountMutation } from '#accounts';
import { useAccountGroups } from '#hooks/useAccountGroups';
import { useAccounts } from '#hooks/useAccounts';

import { computeAccountMove, computeGroupMove } from './accountTreeMoves';
import { parseTreeKey } from './treeKeys';
import type { SidebarTreeNode } from './treeKeys';
import { getEffectiveGroupId } from './useSidebarAccountTree';
import type { GroupBucket } from './useSidebarAccountTree';

export type AccountTreeSide = 'on' | 'off' | 'closed';

type DraggedNode =
  | {
      kind: 'account';
      accountId: AccountEntity['id'];
      groupId: AccountGroupEntity['id'] | null;
    }
  | { kind: 'group'; groupId: AccountGroupEntity['id'] };

type UseAccountTreeDragAndDropArgs = {
  side: AccountTreeSide;
  buckets: GroupBucket[];
  isDisabled: boolean;
};

export function useAccountTreeDragAndDrop({
  side,
  buckets,
  isDisabled,
}: UseAccountTreeDragAndDropArgs) {
  const { data: accounts = [] } = useAccounts();
  const { data: accountGroups = [] } = useAccountGroups();
  const moveAccount = useMoveAccountMutation();
  const moveGroup = useMoveAccountGroupMutation();
  const [dragged, setDragged] = useState<DraggedNode | null>(null);
  const [hoveredGroupId, setHoveredGroupId] = useState<
    AccountGroupEntity['id'] | null
  >(null);
  const [isDraggingGroup, setIsDraggingGroup] = useState(false);
  const collapseTimer = useRef<number | undefined>(undefined);

  const accountType = `sidebar-account-${side}`;
  const groupType = `sidebar-group-${side}`;
  const liveGroupIds = new Set(accountGroups.map(group => group.id));
  const firstRootGroupId = buckets.find(bucket => bucket.group != null)?.group
    ?.id;

  const groupOfNode = (node: SidebarTreeNode | null) => {
    if (node?.kind === 'group') {
      return node.groupId;
    }
    if (node?.kind === 'account') {
      const account = accounts.find(item => item.id === node.accountId);
      return account == null
        ? null
        : getEffectiveGroupId(account, liveGroupIds);
    }
    return null;
  };

  const isValidTarget = (target: DropTarget, types: DragTypes) => {
    if (target.type === 'root') {
      return false;
    }
    const node = parseTreeKey(target.key);
    if (node == null) {
      return false;
    }
    if (types.has(groupType)) {
      return node.kind === 'group' && target.dropPosition !== 'on';
    }
    if (!types.has(accountType)) {
      return false;
    }
    if (node.kind === 'account') {
      return target.dropPosition !== 'on';
    }
    if (target.dropPosition === 'on') {
      return true;
    }
    return (
      target.dropPosition === 'before' && node.groupId === firstRootGroupId
    );
  };

  const applyDrop = (target: ItemDropTarget) => {
    const targetNode = parseTreeKey(target.key);
    if (dragged == null || targetNode == null) {
      return;
    }

    if (dragged.kind === 'group') {
      if (targetNode.kind !== 'group' || target.dropPosition === 'on') {
        return;
      }
      const move = computeGroupMove({
        groups: accountGroups,
        draggedId: dragged.groupId,
        targetId: targetNode.groupId,
        position: target.dropPosition,
      });
      if (move != null) {
        moveGroup.mutate(move);
      }
      return;
    }

    const move = computeAccountMove({
      accounts,
      liveGroupIds,
      draggedId: dragged.accountId,
      target:
        targetNode.kind === 'account'
          ? {
              kind: 'account',
              accountId: targetNode.accountId,
              position: target.dropPosition === 'after' ? 'after' : 'before',
            }
          : {
              kind: 'group',
              groupId: targetNode.groupId,
              position: target.dropPosition,
            },
    });
    if (move != null) {
      moveAccount.mutate(move);
    }
  };

  const { dragAndDropHooks } = useDragAndDrop({
    isDisabled,
    getItems: keys =>
      [...keys].flatMap((key): DragItem[] => {
        const node = parseTreeKey(key);
        if (node?.kind === 'account') {
          return [{ [accountType]: node.accountId, 'text/plain': String(key) }];
        }
        if (node?.kind === 'group') {
          return [{ [groupType]: node.groupId, 'text/plain': String(key) }];
        }
        return [];
      }),
    acceptedDragTypes: [accountType, groupType],
    shouldAcceptItemDrop: (target, types) =>
      types.has(accountType) && parseTreeKey(target.key)?.kind === 'group',
    getDropOperation: (target, types) =>
      isValidTarget(target, types) ? 'move' : 'cancel',
    renderDropIndicator: target => (
      <DropIndicator
        target={target}
        className={css({
          '&[data-drop-target]': {
            height: 3,
            marginBlock: -1.5,
            marginInline: spacing.xxs,
            borderRadius: 3,
            backgroundColor: theme.pageTextLink,
          },
        })}
      />
    ),
    onDragStart: e => {
      const [key] = e.keys;
      const node = key == null ? null : parseTreeKey(key);
      setDragged(
        node?.kind === 'account'
          ? { ...node, groupId: groupOfNode(node) }
          : node,
      );
      if (node?.kind === 'group') {
        collapseTimer.current = window.setTimeout(
          () => setIsDraggingGroup(true),
          0,
        );
      }
    },
    onDragEnd: () => {
      window.clearTimeout(collapseTimer.current);
      setIsDraggingGroup(false);
      setDragged(null);
      setHoveredGroupId(null);
    },
    onDropEnter: e => {
      setHoveredGroupId(
        e.target.type === 'item'
          ? groupOfNode(parseTreeKey(e.target.key))
          : null,
      );
    },
    onDropExit: () => setHoveredGroupId(null),
    onMove: e => applyDrop(e.target),
  });

  const isGroupDropZoneActive = (groupId: AccountGroupEntity['id']) =>
    dragged?.kind === 'account' &&
    hoveredGroupId === groupId &&
    dragged.groupId !== groupId;

  return {
    dragAndDropHooks,
    isGroupDropZoneActive,
    isDraggingGroup,
  };
}
