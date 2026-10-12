import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import type { CategoryEntity } from '@actual-app/core/types/models';

import { CategoryScheduleIndicator } from './CategoryScheduleIndicator';
import { ReorderHandle } from './ReorderHandle';
import { useReorderMode } from './ReorderModeContext';

type CategoryRowNameProps = {
  category: CategoryEntity;
  month: string;
};

export function CategoryRowName({ category, month }: CategoryRowNameProps) {
  const isReordering = useReorderMode();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        minWidth: 0,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {isReordering && <ReorderHandle scope="category" />}
      <Text
        style={{
          ...styles.smallText,
          ...styles.ellipsisText,
          minWidth: 0,
          fontWeight: 600,
          color: theme.tableText,
          textAlign: 'left',
        }}
        data-testid="category-name"
      >
        {category.name}
      </Text>
      <CategoryScheduleIndicator category={category} month={month} />
    </View>
  );
}
