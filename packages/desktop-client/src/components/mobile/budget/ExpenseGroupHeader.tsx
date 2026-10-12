import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { CategoryGroupEntity } from '@actual-app/core/types/models';

import { useLongPress } from '#hooks/useLongPress';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { getRowGridStyle, ROW_PRESSABLE_STYLE } from './budgetTableStyles';
import { CategoryGroupRowName } from './CategoryGroupRowName';
import { ExpenseGroupCells } from './ExpenseGroupCells';

type ExpenseGroupHeaderProps = {
  categoryGroup: CategoryGroupEntity;
  month: string;
  onShowCategoryGroup: (id: CategoryGroupEntity['id']) => void;
  isCollapsed: (id: CategoryGroupEntity['id']) => boolean;
  onToggleCollapse: (id: CategoryGroupEntity['id']) => void;
  show3Columns: boolean;
  showBudgetedColumn: boolean;
  isHidden: boolean;
};

export function ExpenseGroupHeader({
  categoryGroup,
  month,
  onShowCategoryGroup,
  show3Columns,
  showBudgetedColumn,
  isCollapsed,
  onToggleCollapse,
  isHidden,
}: ExpenseGroupHeaderProps) {
  const dispatch = useDispatch();
  const { handlers: longPressHandlers, wasRecentLongPress } = useLongPress(
    () => {
      dispatch(
        pushModal({
          modal: {
            name: 'category-group-actions',
            options: { groupId: categoryGroup.id, month },
          },
        }),
      );
    },
  );

  return (
    <View
      data-testid="category-group-row"
      onClick={() => {
        if (!wasRecentLongPress()) {
          onToggleCollapse(categoryGroup.id);
        }
      }}
      {...longPressHandlers}
      style={{
        ...ROW_PRESSABLE_STYLE,
        ...getRowGridStyle(show3Columns ? 2 : 1),
        position: 'sticky',
        top: 0,
        zIndex: 2,
        paddingTop: spacing.xs,
        paddingBottom: spacing.xs,
        borderBottomWidth: 1,
        borderColor: theme.tableBorder,
        opacity: isHidden ? 0.5 : undefined,
        backgroundColor: monthUtils.isCurrentMonth(month)
          ? theme.budgetHeaderCurrentMonth
          : theme.budgetHeaderOtherMonth,
      }}
    >
      <CategoryGroupRowName
        group={categoryGroup}
        isCollapsed={isCollapsed(categoryGroup.id)}
        isDraggable
        onPress={() => onShowCategoryGroup(categoryGroup.id)}
        onToggleCollapse={() => onToggleCollapse(categoryGroup.id)}
      />
      <ExpenseGroupCells
        group={categoryGroup}
        show3Columns={show3Columns}
        showBudgetedColumn={showBudgetedColumn}
      />
    </View>
  );
}
