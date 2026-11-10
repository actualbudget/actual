import {
  DropIndicator,
  GridList,
  isTextDropItem,
  useDragAndDrop,
} from 'react-aria-components';
import type { ItemDropTarget } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';
import { css } from '@emotion/css';

import { useReorderCategoryMutation } from '#budget';
import { findSortDown } from '#components/budget/util';

import { ExpenseCategoryListItem } from './ExpenseCategoryListItem';

// A dedicated drag type keeps income categories and category groups out of
// expense groups.
const EXPENSE_CATEGORY_DRAG_TYPE = 'application/x-actual-expense-category';

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
  const reorderCategory = useReorderCategoryMutation();

  // Moves a dragged category into this group, before or after the drop target.
  // Handles drops from this group and from other expense groups.
  const moveCategoryToTarget = (
    categoryId: CategoryEntity['id'],
    { key: targetKey, dropPosition }: ItemDropTarget,
  ) => {
    reorderCategory.mutate({
      id: categoryId,
      groupId: categoryGroup.id,
      ...findSortDown(
        categories,
        dropPosition === 'before' ? 'top' : 'bottom',
        String(targetKey),
      ),
    });
  };

  const { dragAndDropHooks } = useDragAndDrop({
    acceptedDragTypes: [EXPENSE_CATEGORY_DRAG_TYPE],
    getItems: keys =>
      [...keys].map(key => ({ [EXPENSE_CATEGORY_DRAG_TYPE]: String(key) })),
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
    onReorder: e => {
      const [key] = e.keys;
      moveCategoryToTarget(String(key), e.target);
    },
    onInsert: async e => {
      const [item] = e.items;
      if (!item || !isTextDropItem(item)) {
        return;
      }
      const categoryId = await item.getText(EXPENSE_CATEGORY_DRAG_TYPE);
      moveCategoryToTarget(categoryId, e.target);
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
