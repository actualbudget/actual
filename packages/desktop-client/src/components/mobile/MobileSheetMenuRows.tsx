import type { MenuItemObject } from '@actual-app/components/menu';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';

import { MobileSheetRow } from './MobileSheetRow';

type MobileSheetMenuRowsProps = {
  items: MenuItemObject<string>[];
  onSelect: (name: string) => void;
};

export function MobileSheetMenuRows({
  items,
  onSelect,
}: MobileSheetMenuRowsProps) {
  return (
    <>
      {items.map(item =>
        item.disabled ? (
          <Text
            key={item.name}
            style={{
              ...styles.smallText,
              color: theme.pageTextLight,
              padding: `${spacing.sm}px ${spacing.lg}px ${spacing.lg}px`,
            }}
          >
            {item.text}
          </Text>
        ) : (
          <MobileSheetRow
            key={item.name}
            label={item.text}
            onPress={() => onSelect(item.name)}
          />
        ),
      )}
    </>
  );
}
