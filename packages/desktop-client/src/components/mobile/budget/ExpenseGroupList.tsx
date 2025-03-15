import { type DragItem } from 'react-aria';
import { DropIndicator, GridList, useDragAndDrop } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';

import { moveCategoryGroup } from 'loot-core/client/queries/queriesSlice';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';

import { useDispatch } from '../../../redux';

import {
  ExpenseGroupHeader,
  ExpenseGroupListItem,
} from './ExpenseGroupListItem';

type ExpenseGroupListProps = {
  groups: CategoryGroupEntity[];
  show3Columns: boolean;
  showBudgetedColumn: boolean;
  month: string;
  onEditGroup: (id: CategoryGroupEntity['id']) => void;
  onEditCategory: (id: CategoryEntity['id']) => void;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
  showHiddenCategories: boolean;
  isCollapsed: (id: CategoryGroupEntity['id']) => boolean;
  onToggleCollapse: (id: CategoryGroupEntity['id']) => void;
};

export function ExpenseGroupList({
  groups,
  show3Columns,
  showBudgetedColumn,
  month,
  onEditGroup,
  onEditCategory,
  onBudgetAction,
  showHiddenCategories,
  isCollapsed,
  onToggleCollapse,
}: ExpenseGroupListProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

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
      const group = groups.find(c => c.id === draggedGroupId);
      if (!group) {
        throw new Error(
          `Internal error: category group with ID ${draggedGroupId} not found.`,
        );
      }
      return (
        <ExpenseGroupHeader
          group={group}
          month={month}
          showBudgetedColumn={showBudgetedColumn}
          show3Columns={show3Columns}
          onEdit={() => {}}
          isCollapsed={() => true}
          onToggleCollapse={() => {}}
        />
      );
    },
    onReorder: e => {
      const [key] = e.keys;
      const groupIdToMove = key as CategoryGroupEntity['id'];
      const groupToMove = groups.find(c => c.id === groupIdToMove);

      if (!groupToMove) {
        throw new Error(
          `Internal error: category group with ID ${groupIdToMove} not found.`,
        );
      }

      const targetGroupId = e.target.key as CategoryEntity['id'];

      if (e.target.dropPosition === 'before') {
        dispatch(
          moveCategoryGroup({
            id: groupToMove.id,
            targetId: targetGroupId,
          }),
        );
      } else if (e.target.dropPosition === 'after') {
        const targetGroupIndex = groups.findIndex(c => c.id === targetGroupId);

        if (targetGroupIndex === -1) {
          throw new Error(
            `Internal error: category group with ID ${targetGroupId} not found.`,
          );
        }

        const nextToTargetCategory = groups[targetGroupIndex + 1];

        dispatch(
          moveCategoryGroup({
            id: groupToMove.id,
            // Due to the way `moveCategory` works, we use the category next to the
            // actual target category here because `moveCategory` always shoves the
            // category *before* the target category.
            // On the other hand, using `null` as `targetId` moves the category
            // to the end of the list.
            targetId: nextToTargetCategory?.id || null,
          }),
        );
      }
    },
  });

  return (
    <GridList
      aria-label={t('Expense category groups')}
      items={groups}
      dependencies={[
        month,
        onEditGroup,
        onEditCategory,
        onBudgetAction,
        show3Columns,
        showBudgetedColumn,
        showHiddenCategories,
        isCollapsed,
        onToggleCollapse,
      ]}
      dragAndDropHooks={dragAndDropHooks}
    >
      {group => (
        <ExpenseGroupListItem
          key={group.id}
          value={group}
          month={month}
          onEditGroup={onEditGroup}
          onEditCategory={onEditCategory}
          onBudgetAction={onBudgetAction}
          showBudgetedColumn={showBudgetedColumn}
          show3Columns={show3Columns}
          showHiddenCategories={showHiddenCategories}
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />
      )}
    </GridList>
  );
}
