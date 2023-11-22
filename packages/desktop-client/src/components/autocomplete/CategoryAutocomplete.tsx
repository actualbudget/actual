import React, {
  type ComponentProps,
  Fragment,
  useMemo,
  type ReactNode,
  type CSSProperties,
} from 'react';

import { css } from 'glamor';

import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/src/types/models';

import Split from '../../icons/v0/Split';
import { theme } from '../../style';
import Text from '../common/Text';
import View from '../common/View';

import Autocomplete, { defaultFilterSuggestion } from './Autocomplete';

export type CategoryListProps = {
  items: Array<CategoryEntity & { group?: CategoryGroupEntity }>;
  getItemProps?: (arg: { item }) => Partial<ComponentProps<typeof View>>;
  highlightedIndex: number;
  embedded: boolean;
  footer?: ReactNode;
  groupHeaderStyle?: object;
};
function CategoryList({
  items,
  getItemProps,
  highlightedIndex,
  embedded,
  footer,
  groupHeaderStyle,
}: CategoryListProps) {
  let lastGroup = null;

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
          if (item.id === 'split') {
            return (
              <View
                key="split"
                {...(getItemProps ? getItemProps({ item }) : null)}
                // Downshift calls `setTimeout(..., 250)` in the `onMouseMove`
                // event handler they set on this element. When this code runs
                // in WebKit on touch-enabled devices, taps on this element end
                // up not triggering the `onClick` event (and therefore delaying
                // response to user input) until after the `setTimeout` callback
                // finishes executing. This is caused by content observation code
                // that implements various strategies to prevent the user from
                // accidentally clicking content that changed as a result of code
                // run in the `onMouseMove` event.
                //
                // Long story short, we don't want any delay here between the user
                // tapping and the resulting action being performed. It turns out
                // there's some "fast path" logic that can be triggered in various
                // ways to force WebKit to bail on the content observation process.
                // One of those ways is setting `role="button"` (or a number of
                // other aria roles) on the element, which is what we're doing here.
                //
                // ref:
                // * https://github.com/WebKit/WebKit/blob/447d90b0c52b2951a69df78f06bb5e6b10262f4b/LayoutTests/fast/events/touch/ios/content-observation/400ms-hover-intent.html
                // * https://github.com/WebKit/WebKit/blob/58956cf59ba01267644b5e8fe766efa7aa6f0c5c/Source/WebCore/page/ios/ContentChangeObserver.cpp
                // * https://github.com/WebKit/WebKit/blob/58956cf59ba01267644b5e8fe766efa7aa6f0c5c/Source/WebKit/WebProcess/WebPage/ios/WebPageIOS.mm#L783
                role="button"
                style={{
                  backgroundColor:
                    highlightedIndex === idx
                      ? theme.menuAutoCompleteBackgroundHover
                      : 'transparent',
                  borderRadius: embedded ? 4 : 0,
                  flexShrink: 0,
                  flexDirection: 'row',
                  alignItems: 'center',
                  fontSize: 11,
                  fontWeight: 500,
                  color: theme.noticeTextMenu,
                  padding: '6px 8px',
                  ':active': {
                    backgroundColor: 'rgba(100, 100, 100, .25)',
                  },
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
            <Fragment key={item.id}>
              {showGroup && (
                <div
                  style={{
                    color: theme.menuAutoCompleteTextHeader,
                    padding: '4px 9px',
                    ...groupHeaderStyle,
                  }}
                  data-testid="category-item-group"
                >
                  {`${item.group?.name}`}
                </div>
              )}
              <div
                {...(getItemProps ? getItemProps({ item }) : null)}
                // See comment above.
                role="button"
                className={`${css([
                  {
                    backgroundColor:
                      highlightedIndex === idx
                        ? theme.menuAutoCompleteBackgroundHover
                        : 'transparent',
                    padding: 4,
                    paddingLeft: 20,
                    borderRadius: embedded ? 4 : 0,
                  },
                ])}`}
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
  categoryGroups: Array<CategoryGroupEntity>;
  showSplitOption?: boolean;
  groupHeaderStyle?: CSSProperties;
};

export default function CategoryAutocomplete({
  categoryGroups,
  showSplitOption,
  embedded,
  closeOnBlur,
  groupHeaderStyle,
  ...props
}: CategoryAutocompleteProps) {
  let categorySuggestions: Array<
    CategoryEntity & { group?: CategoryGroupEntity }
  > = useMemo(
    () =>
      categoryGroups.reduce(
        (list, group) =>
          list.concat(
            group.categories
              .filter(category => category.cat_group === group.id)
              .map(category => ({
                ...category,
                group,
              })),
          ),
        showSplitOption ? [{ id: 'split', name: '' } as CategoryEntity] : [],
      ),
    [showSplitOption, categoryGroups],
  );

  return (
    <Autocomplete
      strict={true}
      highlightFirst={true}
      embedded={embedded}
      closeOnBlur={closeOnBlur}
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
            defaultFilterSuggestion(suggestion, value)
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
          groupHeaderStyle={groupHeaderStyle}
        />
      )}
      {...props}
    />
  );
}
