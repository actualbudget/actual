import { isTextDropItem, type DragItem } from 'react-aria';
import { DropIndicator, GridList, useDragAndDrop } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';

import {
  type CategoryGroupEntity,
  type CategoryEntity,
} from 'loot-core/types/models';

import { ExpenseCategoryListItem } from './ExpenseCategoryListItem';

import { moveCategory } from '@desktop-client/budget/budgetSlice';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useDispatch } from '@desktop-client/redux';

const DRAG_TYPE = 'mobile-expense-category-list/category-id';

type ExpenseCategoryListProps = {
  categoryGroup: CategoryGroupEntity;
  categories: CategoryEntity[];
  shouldHideCategory: (category: CategoryEntity) => boolean;
  month: string;
  onEditCategory: (id: string) => void;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
  show3Columns: boolean;
  showBudgetedColumn: boolean;
};

export function ExpenseCategoryList({
  categoryGroup,
  categories,
  month,
  onEditCategory,
  onBudgetAction,
  show3Columns,
  showBudgetedColumn,
  shouldHideCategory,
}: ExpenseCategoryListProps) {
  const { t } = useTranslation();
  const { reorderCategory } = useReorderCategory();

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: keys =>
      [...keys].map(
        key =>
          ({
            [DRAG_TYPE]: key as CategoryEntity['id'],
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
    acceptedDragTypes: [DRAG_TYPE],
    getDropOperation: () => 'move',
    onInsert: async e => {
      const [id] = await Promise.all(
        e.items.filter(isTextDropItem).map(item => item.getText(DRAG_TYPE)),
      );
      reorderCategory({
        id: id as CategoryEntity['id'],
        targetId: e.target.key as CategoryEntity['id'],
        dropPosition: e.target.dropPosition,
      });
    },
    onReorder: e => {
      const [key] = e.keys;
      reorderCategory({
        id: key as CategoryEntity['id'],
        targetId: e.target.key as CategoryEntity['id'],
        dropPosition: e.target.dropPosition,
      });
    },
  });

  return (
    <GridList
      aria-label={t('{{categoryGroupName}} expense group categories', {
        categoryGroupName: categoryGroup.name,
      })}
      items={categories}
      dragAndDropHooks={dragAndDropHooks}
      dependencies={[
        month,
        onEditCategory,
        onBudgetAction,
        shouldHideCategory,
        show3Columns,
        showBudgetedColumn,
      ]}
    >
      {category => (
        <ExpenseCategoryListItem
          key={category.id}
          value={category}
          month={month}
          onEditCategory={onEditCategory}
          onBudgetAction={onBudgetAction}
          isHidden={shouldHideCategory(category)}
          show3Columns={show3Columns}
          showBudgetedColumn={showBudgetedColumn}
        />
      )}
    </GridList>
  );
}

function useReorderCategory() {
  const dispatch = useDispatch();
  const { list: categories } = useCategories();
  const reorderCategory = ({
    id,
    targetId,
    dropPosition,
  }: {
    id: CategoryEntity['id'];
    targetId: CategoryEntity['id'];
    dropPosition: 'on' | 'before' | 'after';
  }) => {
    const categoryToMove = categories.find(c => c.id === id);

    if (!categoryToMove) {
      throw new Error(`Internal error: category with ID ${id} not found.`);
    }

    if (!categoryToMove.group) {
      throw new Error(
        `Internal error: category ${id} is not in a group and cannot be moved.`,
      );
    }

    const targetCategoryGroupId = categories.find(
      c => c.id === targetId,
    )?.group;

    if (dropPosition === 'before') {
      dispatch(
        moveCategory({
          id: categoryToMove.id,
          groupId: targetCategoryGroupId,
          targetId,
        }),
      );
    } else if (dropPosition === 'after') {
      const targetCategoryIndex = categories.findIndex(c => c.id === targetId);

      if (targetCategoryIndex === -1) {
        throw new Error(
          `Internal error: category with ID ${targetId} not found.`,
        );
      }

      const nextToTargetCategory = categories[targetCategoryIndex + 1];

      dispatch(
        moveCategory({
          id: categoryToMove.id,
          groupId: targetCategoryGroupId,
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
    reorderCategory,
  };
}
