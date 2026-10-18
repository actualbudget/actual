import { useMemo } from 'react';
import { Trans } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';

import { useSyncedPref } from '#hooks/useSyncedPref';

import { COLUMN_HEADING_STYLE, getRowGridStyle } from './budgetTableStyles';
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
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const isTracking = budgetType === 'tracking';

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
      <View
        style={{
          ...getRowGridStyle(isTracking ? 1 : 0),
          paddingTop: spacing.xs,
          paddingBottom: spacing.xs,
          borderBottomWidth: 1,
          borderColor: theme.tableBorder,
        }}
      >
        <View />
        {isTracking && (
          <Text style={{ ...COLUMN_HEADING_STYLE, textAlign: 'right' }}>
            <Trans>Budgeted</Trans>
          </Text>
        )}
        <Text style={{ ...COLUMN_HEADING_STYLE, textAlign: 'right' }}>
          <Trans>Received</Trans>
        </Text>
      </View>
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
