import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { SvgCloseOutline } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
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
              variant="bare"
              onPress={() => onRemove(i)}
              aria-label={`Remove Query ${i + 1}`}
            >
              <SvgCloseOutline width={10} height={10} />
            </Button>
          )}
        </View>
      ))}
      <Button variant="bare" onPress={onAdd}>
        <SvgAdd width={10} height={10} style={{ marginRight: 3 }} />
        <Trans>Add new</Trans>
      </Button>
    </View>
  );
}
