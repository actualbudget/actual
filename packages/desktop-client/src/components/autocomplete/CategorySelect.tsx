import React, {
  type ComponentProps,
  Fragment,
  useMemo,
  type ReactNode,
} from 'react';

import Split from '../../icons/v0/Split';
import { theme, styles } from '../../style';
import { View, Button } from '../common';

import Autocomplete, {
  defaultFilterSuggestion,
  AutocompleteFooter,
} from './Autocomplete';

type CategoryGroup = {
  id: string;
  name: string;
  categories: Array<{ id: string; name: string }>;
};

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
            color: theme.altMenuItemText,
            ...styles.altMenuText,
          },
          !embedded && { maxHeight: styles.altMenuMaxHeight },
        ]}
      >
        {items.map((item, idx) => {
          const showGroup = item.cat_group !== lastGroup;
          lastGroup = item.cat_group;
          return (
            <Fragment key={item.id}>
              {showGroup && (
                // Category group headers
                <div
                  style={{
                    ...styles.altMenuHeaderText,
                    color: theme.altMenuItemTextHeader,
                    padding: '4px 9px',
                  }}
                  data-testid="category-item-group"
                >
                  {item.groupName}
                </div>
              )}

              <div
                // Category item
                {...(getItemProps ? getItemProps({ item }) : null)}
                style={{
                  color:
                    highlightedIndex === idx
                      ? theme.altMenuItemTextHover
                      : theme.altMenuItemText,
                  backgroundColor:
                    highlightedIndex === idx
                      ? theme.altMenuItemBackgroundHover
                      : theme.altMenuItemBackground,
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
  onSplit?: () => void;
};
export default function CategoryAutocomplete({
  categoryGroups,
  showSplitOption,
  onSplit,
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
        [],
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
        }
        return 0;
      }}
      filterSuggestions={(suggestions, value) => {
        return suggestions.filter(suggestion => {
          return (
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
          footer={
            <AutocompleteFooter embedded={embedded}>
              {showSplitOption && (
                // Buttons at bottom of list
                // Split transaction menu item
                <Button altMenu onClick={onSplit}>
                  <Split width={10} height={10} style={{ marginRight: 5 }} />
                  Split Transaction
                </Button>
              )}
            </AutocompleteFooter>
          }
        />
      )}
      {...props}
    />
  );
}
