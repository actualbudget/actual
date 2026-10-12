import { useCallback, useMemo } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { GridListItem } from 'react-aria-components';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';

import { ExpenseCategoryList } from './ExpenseCategoryList';
import { ExpenseGroupHeader } from './ExpenseGroupHeader';

type ExpenseGroupListItemProps = ComponentPropsWithoutRef<
  typeof GridListItem<CategoryGroupEntity>
> & {
  month: string;
  showHiddenCategories: boolean;
  onShowCategoryGroup: (id: CategoryGroupEntity['id']) => void;
  onShowCategory: (id: CategoryEntity['id']) => void;
  isCollapsed: (id: CategoryGroupEntity['id']) => boolean;
  onToggleCollapse: (id: CategoryGroupEntity['id']) => void;
  showBudgetedColumn: boolean;
  show3Columns: boolean;
  isHidden: boolean;
  draggingId: string | null;
};

export function ExpenseGroupListItem({
  onShowCategoryGroup,
  onShowCategory,
  month,
  showBudgetedColumn,
  show3Columns,
  showHiddenCategories,
  isCollapsed,
  onToggleCollapse,
  isHidden,
  draggingId,
  ...props
}: ExpenseGroupListItemProps) {
  const { value: categoryGroup } = props;

  const categories = useMemo(
    () =>
      !categoryGroup || isCollapsed(categoryGroup.id)
        ? []
        : (categoryGroup.categories?.filter(
            category => !category.hidden || showHiddenCategories,
          ) ?? []),
    [categoryGroup, isCollapsed, showHiddenCategories],
  );

  const shouldHideCategory = useCallback(
    (category: CategoryEntity) => {
      return !!(category.hidden || categoryGroup?.hidden);
    },
    [categoryGroup?.hidden],
  );

  if (!categoryGroup) {
    return null;
  }

  return (
    <GridListItem textValue={categoryGroup.name} {...props}>
      <View style={{ backgroundColor: theme.tableBackground }}>
        <ExpenseGroupHeader
          categoryGroup={categoryGroup}
          month={month}
          showBudgetedColumn={showBudgetedColumn}
          show3Columns={show3Columns}
          onShowCategoryGroup={onShowCategoryGroup}
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
          isHidden={isHidden}
          isDragging={categoryGroup.id === draggingId}
        />

        <ExpenseCategoryList
          categoryGroup={categoryGroup}
          categories={categories}
          month={month}
          onShowCategory={onShowCategory}
          shouldHideCategory={shouldHideCategory}
          show3Columns={show3Columns}
          showBudgetedColumn={showBudgetedColumn}
          draggingId={draggingId}
        />
      </View>
    </GridListItem>
  );
}
