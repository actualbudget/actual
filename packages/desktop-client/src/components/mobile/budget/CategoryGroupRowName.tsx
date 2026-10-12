import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgExpandArrow } from '@actual-app/components/icons/v0';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import type { CategoryGroupEntity } from '@actual-app/core/types/models';
import { css } from '@emotion/css';

import { LABEL_STYLE } from './budgetTableStyles';
import { HiddenDragButton } from './HiddenDragButton';

type CategoryGroupRowNameProps = {
  group: CategoryGroupEntity;
  isCollapsed: boolean;
  isDraggable?: boolean;
  onPress: () => void;
  onToggleCollapse: () => void;
};

export function CategoryGroupRowName({
  group,
  isCollapsed,
  isDraggable = false,
  onPress,
  onToggleCollapse,
}: CategoryGroupRowNameProps) {
  const { t } = useTranslation();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      {isDraggable && <HiddenDragButton />}
      <Button
        variant="bare"
        aria-label={
          isCollapsed
            ? t('Expand {{groupName}} group', { groupName: group.name })
            : t('Collapse {{groupName}} group', { groupName: group.name })
        }
        aria-expanded={!isCollapsed}
        className={css({
          flexShrink: 0,
          padding: spacing.xs,
          margin: -spacing.xs,
          color: theme.pageTextSubdued,
          '&[data-pressed]': {
            backgroundColor: 'transparent',
          },
        })}
        onPress={onToggleCollapse}
      >
        <SvgExpandArrow
          width={8}
          height={8}
          style={{
            flexShrink: 0,
            transition: 'transform .1s',
            transform: isCollapsed ? 'rotate(-90deg)' : '',
          }}
        />
      </Button>
      <Button
        variant="bare"
        style={{
          padding: 0,
          minWidth: 0,
          flexShrink: 1,
          overflow: 'hidden',
          justifyContent: 'flex-start',
        }}
        onPress={onPress}
      >
        <Text
          style={{
            ...LABEL_STYLE,
            ...styles.ellipsisText,
            minWidth: 0,
            fontWeight: 700,
            textAlign: 'left',
          }}
          data-testid="category-group-name"
        >
          {group.name}
        </Text>
      </Button>
    </View>
  );
}
