import React, { type ComponentProps } from 'react';

import { useFilters } from 'loot-core/src/client/data-hooks/filters';

import { theme } from '../../style';
import View from '../common/View';

import Autocomplete from './Autocomplete';

type FilterListProps = {
  items: { id: string; name: string }[];
  getItemProps: (arg: { item: unknown }) => ComponentProps<typeof View>;
  highlightedIndex: number;
  embedded?: boolean;
};

function FilterList({
  items,
  getItemProps,
  highlightedIndex,
  embedded,
}: FilterListProps) {
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
              data-testid={
                'filter-item' + (highlightedIndex === idx ? '-highlighted' : '')
              }
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
} & ComponentProps<typeof Autocomplete>;

export default function SavedFilterAutocomplete({
  embedded,
  ...props
}: SavedFilterAutocompleteProps) {
  let filters = useFilters() || [];

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
