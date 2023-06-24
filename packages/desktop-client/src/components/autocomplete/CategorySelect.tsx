import React, {
  type ComponentProps,
  Fragment,
  forwardRef,
  useMemo,
  type ReactNode,
} from 'react';

import Split from '../../icons/v0/Split';
import { colors } from '../../style';
import { type HTMLPropsWithStyle } from '../../types/utils';
import { View, Text, Select } from '../common';

import Autocomplete, { defaultFilterSuggestion } from './Autocomplete';

type CategoryGroup = {
  id: string;
  name: string;
  categories: Array<{ id: string; name: string }>;
};

type NativeCategorySelectProps = HTMLPropsWithStyle<HTMLSelectElement> & {
  categoryGroups: CategoryGroup[];
  emptyLabel: string;
};
export const NativeCategorySelect = forwardRef<
  HTMLSelectElement,
  NativeCategorySelectProps
>(({ categoryGroups, emptyLabel, ...nativeProps }, ref) => {
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
});

type CategoryListProps = {
  items: Array<{
    id: string;
    cat_group: unknown;
    groupName: string;
    name: string;
  }>;
  getItemProps?: (arg: { item }) => Partial<ComponentProps<typeof View>>;
  highlightedIndex: number;
  embedded: boolean;
  footer?: ReactNode;
};
function CategoryList({
  items,
  getItemProps,
  highlightedIndex,
  embedded,
  footer,
}: CategoryListProps) {
  let lastGroup = null;

  return (
    <View>
      <View
        style={[
          {
            overflow: 'auto',
            padding: '5px 0',
          },
          !embedded && { maxHeight: 175 },
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
                  padding: '6px 8px',
                }}
                data-testid="split-transaction-button"
              >
                <Text style={{ lineHeight: 0 }}>
                  <Split
                    width={10}
                    height={10}
                    style={{ marginRight: 5, color: 'inherit' }}
                  />
                </Text>
                Split Transaction
              </View>
            );
          }

          const showGroup = item.cat_group !== lastGroup;
          lastGroup = item.cat_group;
          return (
            <Fragment key={item.id}>
              {showGroup && (
                <div
                  style={{
                    color: colors.y9,
                    padding: '4px 9px',
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
                  borderRadius: embedded ? 4 : 0,
                }}
                data-testid={
                  'category-item' +
                  (highlightedIndex === idx ? '-highlighted' : '')
                }
              >
                {item.name}
              </div>
            </Fragment>
          );
        })}
      </View>
      {footer}
    </View>
  );
}

type CategoryAutocompleteProps = ComponentProps<typeof Autocomplete> & {
  categoryGroups: CategoryGroup[];
  showSplitOption?: boolean;
};
export default function CategoryAutocomplete({
  categoryGroups,
  showSplitOption,
  embedded,
  ...props
}: CategoryAutocompleteProps) {
  let categorySuggestions = useMemo(
    () =>
      categoryGroups.reduce(
        (list, group) =>
          list.concat(
            group.categories.map(category => ({
              ...category,
              groupName: group.name,
            })),
          ),
        showSplitOption ? [{ id: 'split', name: '' }] : [],
      ),
    [categoryGroups],
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
