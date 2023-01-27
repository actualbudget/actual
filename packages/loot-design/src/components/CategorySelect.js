import React, { useMemo } from 'react';

import { colors } from '../style';
import Split from '../svg/v0/Split';

import Autocomplete, { defaultFilterSuggestion } from './Autocomplete';
import { View, Text, Select } from './common';

export const NativeCategorySelect = React.forwardRef(
  ({ categoryGroups, emptyLabel, ...nativeProps }, ref) => {
    return (
      <Select {...nativeProps} ref={ref}>
        <option value="">{emptyLabel || 'Select category...'}</option>
        {categoryGroups.map(group => (
          <optgroup key={group.id} label={group.name}>
            {group.categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
    );
  }
);

export function CategoryList({
  items,
  getItemProps,
  highlightedIndex,
  embedded,
  footer
}) {
  let lastGroup = null;

  return (
    <View>
      <View
        style={[
          {
            overflow: 'auto',
            padding: '5px 0'
          },
          !embedded && { maxHeight: 175 }
        ]}
      >
        {items.map((item, idx) => {
          if (item.id === 'split') {
            return (
              <View
                key="split"
                {...(getItemProps ? getItemProps({ item }) : null)}
                style={{
                  backgroundColor:
                    highlightedIndex === idx ? colors.n4 : 'transparent',
                  borderRadius: embedded ? 4 : 0,
                  flexShrink: 0,
                  flexDirection: 'row',
                  alignItems: 'center',
                  fontSize: 11,
                  fontWeight: 500,
                  color: colors.g8,
                  padding: '6px 8px'
                }}
                data-testid="split-transaction-button"
              >
                <Text style={{ lineHeight: 0 }}>
                  <Split width={10} height={10} style={{ marginRight: 5 }} />
                </Text>
                Split Transaction
              </View>
            );
          }

          const showGroup = item.cat_group !== lastGroup;
          lastGroup = item.cat_group;
          return (
            <React.Fragment key={item.id}>
              {showGroup && (
                <div
                  style={{
                    color: colors.y9,
                    padding: '4px 9px'
                  }}
                  data-testid="category-item-group"
                >
                  {item.groupName}
                </div>
              )}
              <div
                {...(getItemProps ? getItemProps({ item }) : null)}
                style={{
                  backgroundColor:
                    highlightedIndex === idx ? colors.n4 : 'transparent',
                  padding: 4,
                  paddingLeft: 20,
                  borderRadius: embedded ? 4 : 0
                }}
                data-testid={
                  'category-item' +
                  (highlightedIndex === idx ? '-highlighted' : '')
                }
              >
                {item.name}
              </div>
            </React.Fragment>
          );
        })}
      </View>
      {footer}
    </View>
  );
}

export default function CategoryAutocomplete({
  categoryGroups,
  showSplitOption,
  embedded,
  onSplit,
  ...props
}) {
  let categorySuggestions = useMemo(
    () =>
      categoryGroups.reduce(
        (list, group) =>
          list.concat(
            group.categories.map(category => ({
              ...category,
              groupName: group.name
            }))
          ),
        showSplitOption ? [{ id: 'split', name: '' }] : []
      ),
    [categoryGroups]
  );

  return (
    <Autocomplete
      strict={true}
      highlightFirst={true}
      embedded={embedded}
      getHighlightedIndex={suggestions => {
        if (suggestions.length === 0) {
          return null;
        } else if (suggestions[0].id === 'split') {
          return suggestions.length > 1 ? 1 : null;
        }
        return 0;
      }}
      filterSuggestions={(suggestions, value) => {
        return suggestions.filter(suggestion => {
          return (
            suggestion.id === 'split' ||
            defaultFilterSuggestion(suggestion, value) ||
            suggestion.groupName.toLowerCase().includes(value.toLowerCase())
          );
        });
      }}
      suggestions={categorySuggestions}
      renderItems={(items, getItemProps, highlightedIndex) => (
        <CategoryList
          items={items}
          embedded={embedded}
          getItemProps={getItemProps}
          highlightedIndex={highlightedIndex}
        />
      )}
      {...props}
    />
  );
}
