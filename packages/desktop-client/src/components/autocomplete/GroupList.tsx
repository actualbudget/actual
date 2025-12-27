import React, { type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { ItemHeader } from './ItemHeader';

export function GroupList<T extends { id: string; name: string }>({
  items,
  getItemProps,
  highlightedIndex,
  embedded,
}: {
  items: T[];
  getItemProps: (arg: { item: T }) => ComponentProps<typeof View>;
  highlightedIndex: number;
  embedded?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View>
      <View
        style={{
          overflow: 'auto',
          padding: '5px 0',
          ...(!embedded && { maxHeight: 175 }),
        }}
      >
        <ItemHeader title={t('Groups')} type="filter" />
        {items.map((item, idx) => {
          return [
            <div
              key={item.id}
              {...(getItemProps ? getItemProps({ item }) : null)}
              style={{
                backgroundColor:
                  highlightedIndex === idx
                    ? theme.menuAutoCompleteBackgroundHover
                    : 'transparent',
                padding: 4,
                paddingLeft: 20,
                borderRadius: embedded ? 4 : 0,
              }}
              data-testid={`${item.name}-group-item`}
              data-highlighted={highlightedIndex === idx || undefined}
            >
              {item.name}
            </div>,
          ];
        })}
      </View>
    </View>
  );
}
