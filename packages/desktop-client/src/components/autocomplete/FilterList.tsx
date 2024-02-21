import React, { type ComponentProps } from 'react';

import { theme } from '../../style/theme';
import { View } from '../common/View';

import { ItemHeader } from './ItemHeader';

export function FilterList<T extends { id: string; name: string }>({
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
  return (
    <View>
      <View
        style={{
          overflow: 'auto',
          padding: '5px 0',
          ...(!embedded && { maxHeight: 175 }),
        }}
      >
        <ItemHeader title="Saved Filters" type="filter" />
        {items.map((item, idx) => {
          return [
            <div
              {...(getItemProps ? getItemProps({ item }) : null)}
              key={item.id}
              style={{
                backgroundColor:
                  highlightedIndex === idx
                    ? theme.menuAutoCompleteBackgroundHover
                    : 'transparent',
                padding: 4,
                paddingLeft: 20,
                borderRadius: embedded ? 4 : 0,
              }}
              data-testid={`${item.name}-filter-item`}
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
