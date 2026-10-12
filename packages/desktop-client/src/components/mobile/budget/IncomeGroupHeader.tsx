import { Trans } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { CategoryGroupEntity } from '@actual-app/core/types/models';

import { useLongPress } from '#hooks/useLongPress';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import {
  COLUMN_HEADING_STYLE,
  getRowGridStyle,
  ROW_PRESSABLE_STYLE,
} from './budgetTableStyles';
import { CategoryGroupRowName } from './CategoryGroupRowName';

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
      {...longPressHandlers}
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
      {isTracking && (
        <Text style={{ ...COLUMN_HEADING_STYLE, textAlign: 'right' }}>
          <Trans>Budgeted</Trans>
        </Text>
      )}
      <Text style={{ ...COLUMN_HEADING_STYLE, textAlign: 'right' }}>
        <Trans>Received</Trans>
      </Text>
    </View>
  );
}
