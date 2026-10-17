import { useState } from 'react';
import type { DragItem } from 'react-aria';
import { DropIndicator, GridList, useDragAndDrop } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';
import { css } from '@emotion/css';

import {
  useMoveCategoryGroupMutation,
  useReorderCategoryMutation,
} from '#budget';
import { useTouchReorder } from '#hooks/useTouchReorder';
import { useUndo } from '#hooks/useUndo';

import { ExpenseGroupHeader } from './ExpenseGroupHeader';
import { ExpenseGroupListItem } from './ExpenseGroupListItem';
import { ReorderDropIndicator } from './ReorderDropIndicator';
import { useReorderMode } from './ReorderModeContext';

type ExpenseGroupListProps = {
  categoryGroups: CategoryGroupEntity[];
  show3Columns: boolean;
  showBudgetedColumn: boolean;
  month: string;
  onShowCategoryGroup: (id: CategoryGroupEntity['id']) => void;
  onShowCategory: (id: CategoryEntity['id']) => void;
  showHiddenCategories: boolean;
  isCollapsed: (id: CategoryGroupEntity['id']) => boolean;
  onToggleCollapse: (id: CategoryGroupEntity['id']) => void;
};

export function ExpenseGroupList({
  categoryGroups,
  show3Columns,
  showBudgetedColumn,
  month,
  onShowCategoryGroup,
  onShowCategory,
  showHiddenCategories,
  isCollapsed,
  onToggleCollapse,
}: ExpenseGroupListProps) {
  const { t } = useTranslation();
  const moveCategoryGroup = useMoveCategoryGroupMutation();
  const reorderCategory = useReorderCategoryMutation();
  const { showUndoNotification } = useUndo();
  const isReordering = useReorderMode();
  const [announcement, setAnnouncement] = useState('');

  const touchReorder = useTouchReorder({
    isEnabled: isReordering,
    onMoveCategory: (id, { groupId, targetId }) => {
      const category = categoryGroups
        .flatMap(group => group.categories ?? [])
        .find(c => c.id === id);
      const group = categoryGroups.find(g => g.id === groupId);
      if (!category || !group) {
        return;
      }
      const hasNameConflict = (group.categories ?? []).some(
        c =>
          c.id !== id && c.name.toUpperCase() === category.name.toUpperCase(),
      );
      if (hasNameConflict) {
        reorderCategory.mutate({ id, groupId, targetId });
        return;
      }
      const others = (group.categories ?? []).filter(
        c => c.id !== id && (!c.hidden || showHiddenCategories),
      );
      const targetIndex = targetId
        ? others.findIndex(c => c.id === targetId)
        : -1;
      const position = (targetIndex === -1 ? others.length : targetIndex) + 1;
      reorderCategory.mutate(
        { id, groupId, targetId },
        {
          onSuccess: () => {
            setAnnouncement(
              t('{{name}} moved to position {{position}} in {{groupName}}', {
                name: category.name,
                position,
                groupName: group.name,
              }),
            );
            showUndoNotification({
              message: t('Moved {{name}}', { name: category.name }),
            });
          },
        },
      );
    },
    onMoveGroup: (id, targetId) => {
      const group = categoryGroups.find(g => g.id === id);
      if (!group) {
        return;
      }
      const others = categoryGroups.filter(g => g.id !== id);
      const targetIndex = targetId
        ? others.findIndex(g => g.id === targetId)
        : -1;
      const position = (targetIndex === -1 ? others.length : targetIndex) + 1;
      moveCategoryGroup.mutate(
        { id, targetId },
        {
          onSuccess: () => {
            setAnnouncement(
              t('{{name}} moved to position {{position}}', {
                name: group.name,
                position,
              }),
            );
            showUndoNotification({
              message: t('Moved {{name}}', { name: group.name }),
            });
          },
        },
      );
    },
  });

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: keys =>
      [...keys].map(
        key =>
          ({
            'text/plain': key as CategoryEntity['id'],
          }) as DragItem,
      ),
    renderDropIndicator: target => {
      return (
        <DropIndicator
          target={target}
          className={css({
            '&[data-drop-target]': {
              height: 4,
              backgroundColor: theme.tableBorderSeparator,
              opacity: 1,
              borderRadius: 4,
            },
          })}
        />
      );
    },
    renderDragPreview: items => {
      const draggedGroupId = items[0]['text/plain'];
      const group = categoryGroups.find(c => c.id === draggedGroupId);
      if (!group) {
        throw new Error(
          `Internal error: category group with ID ${draggedGroupId} not found.`,
        );
      }
      return (
        <ExpenseGroupHeader
          categoryGroup={group}
          month={month}
          showBudgetedColumn={showBudgetedColumn}
          show3Columns={show3Columns}
          onShowCategoryGroup={() => {}}
          isCollapsed={() => true}
          onToggleCollapse={() => {}}
          isHidden={false}
        />
      );
    },
    onReorder: e => {
      const [key] = e.keys;
      const groupIdToMove = key as CategoryGroupEntity['id'];
      const groupToMove = categoryGroups.find(c => c.id === groupIdToMove);

      if (!groupToMove) {
        throw new Error(
          `Internal error: category group with ID ${groupIdToMove} not found.`,
        );
      }

      const targetGroupId = e.target.key as CategoryEntity['id'];

      if (e.target.dropPosition === 'before') {
        moveCategoryGroup.mutate({
          id: groupToMove.id,
          targetId: targetGroupId,
        });
      } else if (e.target.dropPosition === 'after') {
        const targetGroupIndex = categoryGroups.findIndex(
          c => c.id === targetGroupId,
        );

        if (targetGroupIndex === -1) {
          throw new Error(
            `Internal error: category group with ID ${targetGroupId} not found.`,
          );
        }

        const nextToTargetCategory = categoryGroups[targetGroupIndex + 1];

        moveCategoryGroup.mutate({
          id: groupToMove.id,
          // Due to the way `moveCategory` works, we use the category next to the
          // actual target category here because `moveCategory` always shoves the
          // category *before* the target category.
          // On the other hand, using `null` as `targetId` moves the category
          // to the end of the list.
          targetId: nextToTargetCategory?.id || null,
        });
      }
    },
  });

  return (
    <View {...touchReorder.containerProps} style={{ position: 'relative' }}>
      <GridList
        aria-label={t('Expense category groups')}
        items={categoryGroups}
        dependencies={[
          month,
          onShowCategoryGroup,
          onShowCategory,
          show3Columns,
          showBudgetedColumn,
          showHiddenCategories,
          isCollapsed,
          onToggleCollapse,
          touchReorder.draggingId,
        ]}
        dragAndDropHooks={dragAndDropHooks}
      >
        {categoryGroup => (
          <ExpenseGroupListItem
            key={categoryGroup.id}
            value={categoryGroup}
            month={month}
            onShowCategoryGroup={onShowCategoryGroup}
            onShowCategory={onShowCategory}
            showBudgetedColumn={showBudgetedColumn}
            show3Columns={show3Columns}
            showHiddenCategories={showHiddenCategories}
            isCollapsed={isCollapsed}
            onToggleCollapse={onToggleCollapse}
            isHidden={!!categoryGroup.hidden}
            draggingId={touchReorder.draggingId}
          />
        )}
      </GridList>
      {touchReorder.indicatorTop != null && (
        <ReorderDropIndicator top={touchReorder.indicatorTop} />
      )}
      <View aria-live="polite" aria-atomic style={styles.visuallyHidden}>
        {announcement}
      </View>
    </View>
  );
}
