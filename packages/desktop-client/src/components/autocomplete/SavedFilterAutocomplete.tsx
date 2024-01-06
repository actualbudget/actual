import React, { type ComponentProps } from 'react';

import { useFilters } from 'loot-core/src/client/data-hooks/filters';
import { type TransactionFilterEntity } from 'loot-core/src/types/models';

import { theme } from '../../style';
import { View } from '../common/View';

import { Autocomplete } from './Autocomplete';

type FilterListProps<T> = {
  items: T[];
  getItemProps: (arg: { item: T }) => ComponentProps<typeof View>;
  highlightedIndex: number;
  embedded?: boolean;
};

function FilterList<T extends { id: string; name: string }>({
  items,
  getItemProps,
  highlightedIndex,
  embedded,
}: FilterListProps<T>) {
  return (
    <View>
      <View
        style={{
          overflow: 'auto',
          padding: '5px 0',
          ...(!embedded && { maxHeight: 175 }),
        }}
      >
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

type SavedFilterAutocompleteProps = {
  embedded?: boolean;
} & ComponentProps<typeof Autocomplete<TransactionFilterEntity>>;

export function SavedFilterAutocomplete({
  embedded,
  ...props
}: SavedFilterAutocompleteProps) {
  const filters = useFilters() || [];

  return (
    <Autocomplete
      strict={true}
      highlightFirst={true}
      embedded={embedded}
      suggestions={filters}
      renderItems={(items, getItemProps, highlightedIndex) => (
        <FilterList
          items={items}
          getItemProps={getItemProps}
          highlightedIndex={highlightedIndex}
          embedded={embedded}
        />
      )}
      {...props}
    />
  );
}
