import { type DragItem } from 'react-aria';
import { DropIndicator, GridList, useDragAndDrop } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';

import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';

import {
  ExpenseGroupHeader,
  ExpenseGroupListItem,
} from './ExpenseGroupListItem';

import { moveCategoryGroup } from '@desktop-client/queries/queriesSlice';
import { useDispatch } from '@desktop-client/redux';

type ExpenseGroupListProps = {
  categoryGroups: CategoryGroupEntity[];
  show3Columns: boolean;
  showBudgetedColumn: boolean;
  month: string;
  onEditCategoryGroup: (id: CategoryGroupEntity['id']) => void;
  onEditCategory: (id: CategoryEntity['id']) => void;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
  showHiddenCategories: boolean;
  isCollapsed: (id: CategoryGroupEntity['id']) => boolean;
  onToggleCollapse: (id: CategoryGroupEntity['id']) => void;
};

export function ExpenseGroupList({
  categoryGroups,
  show3Columns,
  showBudgetedColumn,
  month,
  onEditCategoryGroup,
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
          onEditCategoryGroup={() => {}}
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
        dispatch(
          moveCategoryGroup({
            id: groupToMove.id,
            targetId: targetGroupId,
          }),
        );
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
      items={categoryGroups}
      dependencies={[
        month,
        onEditCategoryGroup,
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
      {categoryGroup => (
        <ExpenseGroupListItem
          key={categoryGroup.id}
          value={categoryGroup}
          month={month}
          onEditCategoryGroup={onEditCategoryGroup}
          onEditCategory={onEditCategory}
          onBudgetAction={onBudgetAction}
          showBudgetedColumn={showBudgetedColumn}
          show3Columns={show3Columns}
          showHiddenCategories={showHiddenCategories}
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
          isHidden={!!categoryGroup.hidden}
        />
      )}
    </GridList>
  );
}
