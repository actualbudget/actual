import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

type QueryTabBarProps = {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
};

export function QueryTabBar({
  count,
  activeIndex,
  onSelect,
  onAdd,
  onRemove,
}: QueryTabBarProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 12,
        flexWrap: 'wrap',
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Button
            variant={activeIndex === i ? 'primary' : 'normal'}
            onPress={() => onSelect(i)}
          >
            <Trans>Query {i + 1}</Trans>
          </Button>
          {count > 1 && (
            <Button
              variant="normal"
              onPress={() => onRemove(i)}
              style={{
                color: theme.errorText,
                padding: '2px 6px',
                minWidth: 0,
              }}
            >
              ×
            </Button>
          )}
        </View>
      ))}
      <Button variant="normal" onPress={onAdd}>
        + <Trans>Add</Trans>
      </Button>
    </View>
  );
}
