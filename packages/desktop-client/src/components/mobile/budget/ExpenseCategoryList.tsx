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

import { findSortDown } from '#components/budget/util';
import type { CategoryDropTarget } from '#hooks/useTouchReorder';

import { ExpenseCategoryListItem } from './ExpenseCategoryListItem';

// A dedicated drag type keeps income categories and category groups out of
// expense groups.
const EXPENSE_CATEGORY_DRAG_TYPE = 'application/x-actual-expense-category';

type ExpenseCategoryListProps = {
  categoryGroup: CategoryGroupEntity;
  categories: CategoryEntity[];
  shouldHideCategory: (category: CategoryEntity) => boolean;
  month: string;
  onShowCategory: (id: string) => void;
  onMoveCategory: (
    id: CategoryEntity['id'],
    target: CategoryDropTarget,
  ) => void;
  show3Columns: boolean;
  showBudgetedColumn: boolean;
  draggingId: string | null;
};

export function ExpenseCategoryList({
  categoryGroup,
  categories,
  month,
  onShowCategory,
  onMoveCategory,
  show3Columns,
  showBudgetedColumn,
  shouldHideCategory,
  draggingId,
}: ExpenseCategoryListProps) {
  const { t } = useTranslation();

  // Moves a dragged category into this group, before or after the drop target.
  // Handles drops from this group and from other expense groups.
  const moveCategoryToTarget = (
    categoryId: CategoryEntity['id'],
    { key: targetKey, dropPosition }: ItemDropTarget,
  ) => {
    onMoveCategory(categoryId, {
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
        onShowCategory,
        shouldHideCategory,
        show3Columns,
        showBudgetedColumn,
        draggingId,
      ]}
    >
      {category => (
        <ExpenseCategoryListItem
          key={category.id}
          value={category}
          month={month}
          onShowCategory={onShowCategory}
          isHidden={shouldHideCategory(category)}
          isDragging={category.id === draggingId}
          show3Columns={show3Columns}
          showBudgetedColumn={showBudgetedColumn}
        />
      )}
    </GridList>
  );
}
