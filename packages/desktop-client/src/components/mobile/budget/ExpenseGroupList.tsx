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

import { moveCategoryGroup } from '@desktop-client/budget/budgetSlice';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useDispatch } from '@desktop-client/redux';

const DRAG_TYPE = 'mobile-expense-group-list/category-group-id';

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

  const { reorderCategoryGroup } = useReorderCategoryGroup();
  const { dragAndDropHooks } = useDragAndDrop({
    getItems: keys =>
      [...keys].map(
        key =>
          ({
            [DRAG_TYPE]: key as CategoryGroupEntity['id'],
          }) as DragItem,
      ),
    renderDropIndicator: target => {
      return (
        <DropIndicator
          target={target}
          className={css({
            '&[data-drop-target]': {
              height: 4,
              backgroundColor: theme.tableBorderHover,
              opacity: 1,
              borderRadius: 4,
            },
          })}
        />
      );
    },
    renderDragPreview: items => {
      const draggedGroupId = items[0][DRAG_TYPE];
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
      reorderCategoryGroup({
        id: key as CategoryGroupEntity['id'],
        targetId: e.target.key as CategoryGroupEntity['id'],
        dropPosition: e.target.dropPosition,
      });
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

function useReorderCategoryGroup() {
  const dispatch = useDispatch();
  const { list: categoryGroups } = useCategories();
  const reorderCategoryGroup = ({
    id,
    targetId,
    dropPosition,
  }: {
    id: CategoryGroupEntity['id'];
    targetId: CategoryGroupEntity['id'];
    dropPosition: 'on' | 'before' | 'after';
  }) => {
    const groupToMove = categoryGroups.find(c => c.id === id);

    if (!groupToMove) {
      throw new Error(
        `Internal error: category group with ID ${id} not found.`,
      );
    }

    if (dropPosition === 'before') {
      dispatch(
        moveCategoryGroup({
          id: groupToMove.id,
          targetId,
        }),
      );
    } else if (dropPosition === 'after') {
      const targetGroupIndex = categoryGroups.findIndex(c => c.id === targetId);

      if (targetGroupIndex === -1) {
        throw new Error(
          `Internal error: category group with ID ${targetId} not found.`,
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
  };

  return {
    reorderCategoryGroup,
  };
}
