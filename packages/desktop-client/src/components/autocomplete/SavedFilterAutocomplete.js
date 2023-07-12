import React from 'react';

import { useFilters } from 'loot-core/src/client/data-hooks/filters';

import { colors, styles } from '../../style';
import { View } from '../common';

import Autocomplete from './Autocomplete';

function FilterList({ items, getItemProps, highlightedIndex, embedded }) {
  return (
    <View>
      <View
        style={[
          { overflow: 'auto', padding: '5px 0', ...styles.altMenuText },
          !embedded && { maxHeight: 175 },
        ]}
      >
        {items.map((item, idx) => {
          return [
            <div
              {...(getItemProps ? getItemProps({ item }) : null)}
              key={item.id}
              style={{
                backgroundColor:
                  highlightedIndex === idx
                    ? colors.altMenuItemBackgroundHover
                    : 'transparent',
                color:
                  highlightedIndex === idx
                    ? colors.altMenuItemTextHover
                    : colors.altMenuItemText,
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

export default function SavedFilterAutocomplete({ embedded, ...props }) {
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
