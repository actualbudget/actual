import { useMemo } from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';

import { IncomeCategoryList } from './IncomeCategoryList';
import { IncomeGroupHeader } from './IncomeGroupHeader';

type IncomeGroupProps = {
  categoryGroup: CategoryGroupEntity;
  month: string;
  showHiddenCategories: boolean;
  onShowCategoryGroup: (id: CategoryGroupEntity['id']) => void;
  onShowCategory: (id: CategoryEntity['id']) => void;
  isCollapsed: (id: CategoryGroupEntity['id']) => boolean;
  onToggleCollapse: (id: CategoryGroupEntity['id']) => void;
};

export function IncomeGroup({
  categoryGroup,
  month,
  showHiddenCategories,
  onShowCategoryGroup,
  onShowCategory,
  isCollapsed,
  onToggleCollapse,
}: IncomeGroupProps) {
  const categories = useMemo(
    () =>
      isCollapsed(categoryGroup.id)
        ? []
        : (categoryGroup.categories?.filter(
            category => !category.hidden || showHiddenCategories,
          ) ?? []),
    [
      categoryGroup.categories,
      categoryGroup.id,
      isCollapsed,
      showHiddenCategories,
    ],
  );

  return (
    <View style={{ backgroundColor: theme.tableBackground }}>
      <IncomeGroupHeader
        group={categoryGroup}
        month={month}
        onShowCategoryGroup={onShowCategoryGroup}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
      />
      <IncomeCategoryList
        categoryGroup={categoryGroup}
        categories={categories}
        month={month}
        onShowCategory={onShowCategory}
      />
    </View>
  );
}
