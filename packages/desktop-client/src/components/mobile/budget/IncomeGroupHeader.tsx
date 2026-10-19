import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { CategoryGroupEntity } from '@actual-app/core/types/models';

import { makeAmountFullStyle } from '#components/budget/util';
import { CellValue } from '#components/spreadsheet/CellValue';
import { useBudgetBindings } from '#hooks/useBudgetBindings';
import { useLongPress } from '#hooks/useLongPress';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import {
  getRowGridStyle,
  GROUP_AMOUNT_STYLE,
  ROW_PRESSABLE_STYLE,
} from './budgetTableStyles';
import { CategoryAmountText } from './CategoryAmountText';
import { CategoryGroupRowName } from './CategoryGroupRowName';
import { useReorderMode } from './ReorderModeContext';

type IncomeGroupHeaderProps = {
  group: CategoryGroupEntity;
  month: string;
  onShowCategoryGroup: (id: CategoryGroupEntity['id']) => void;
  isCollapsed: (id: CategoryGroupEntity['id']) => boolean;
  onToggleCollapse: (id: CategoryGroupEntity['id']) => void;
};

export function IncomeGroupHeader({
  group,
  month,
  onShowCategoryGroup,
  isCollapsed,
  onToggleCollapse,
}: IncomeGroupHeaderProps) {
  const dispatch = useDispatch();
  const isReordering = useReorderMode();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const isTracking = budgetType === 'tracking';
  const { handlers: longPressHandlers, wasRecentLongPress } = useLongPress(
    () => {
      dispatch(
        pushModal({
          modal: {
            name: 'category-group-actions',
            options: { groupId: group.id, month },
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
          onToggleCollapse(group.id);
        }
      }}
      {...(isReordering ? {} : longPressHandlers)}
      style={{
        ...ROW_PRESSABLE_STYLE,
        ...getRowGridStyle(isTracking ? 1 : 0),
        position: 'sticky',
        top: 0,
        zIndex: 2,
        paddingTop: spacing.xs,
        paddingBottom: spacing.xs,
        borderBottomWidth: 1,
        borderColor: theme.tableBorder,
        opacity: group.hidden ? 0.5 : undefined,
        backgroundColor: monthUtils.isCurrentMonth(month)
          ? theme.budgetHeaderCurrentMonth
          : theme.budgetHeaderOtherMonth,
      }}
    >
      <CategoryGroupRowName
        group={group}
        isCollapsed={isCollapsed(group.id)}
        onPress={() => onShowCategoryGroup(group.id)}
        onToggleCollapse={() => onToggleCollapse(group.id)}
      />
      <IncomeGroupCells group={group} isTracking={isTracking} />
    </View>
  );
}

type IncomeGroupCellsProps = {
  group: CategoryGroupEntity;
  isTracking: boolean;
};

function IncomeGroupCells({ group, isTracking }: IncomeGroupCellsProps) {
  const bindings = useBudgetBindings();

  return (
    <>
      {isTracking && (
        <CellValue<'envelope-budget' | 'tracking-budget', 'group-budget'>
          binding={bindings.groupBudgeted(group.id)}
          type="financial"
        >
          {({ value }) => (
            <CategoryAmountText value={value} style={GROUP_AMOUNT_STYLE} />
          )}
        </CellValue>
      )}
      <CellValue<'envelope-budget' | 'tracking-budget', 'group-sum-amount'>
        binding={bindings.groupSumAmount(group.id)}
        type="financial"
      >
        {({ value }) => (
          <CategoryAmountText
            value={value}
            style={{
              ...GROUP_AMOUNT_STYLE,
              fontWeight: 700,
              ...makeAmountFullStyle(value),
            }}
          />
        )}
      </CellValue>
    </>
  );
}
