import React, {
  type ComponentProps,
  Fragment,
  useMemo,
  type ReactNode,
  type SVGProps,
  type ComponentType,
  type ComponentPropsWithoutRef,
  type ReactElement,
} from 'react';

import { css } from 'glamor';

import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/src/types/models';

import { SvgSplit } from '../../icons/v0';
import { useResponsive } from '../../ResponsiveProvider';
import { type CSSProperties, theme, styles } from '../../style';
import { Text } from '../common/Text';
import { TextOneLine } from '../common/TextOneLine';
import { View } from '../common/View';

import { Autocomplete, defaultFilterSuggestion } from './Autocomplete';
import { ItemHeader } from './ItemHeader';

type CategoryAutocompleteItem = CategoryEntity & {
  group?: CategoryGroupEntity;
};

export type CategoryListProps = {
  items: CategoryAutocompleteItem[];
  getItemProps?: (arg: {
    item: CategoryAutocompleteItem;
  }) => Partial<ComponentProps<typeof View>>;
  highlightedIndex: number;
  embedded?: boolean;
  footer?: ReactNode;
  renderSplitTransactionButton?: (
    props: ComponentPropsWithoutRef<typeof SplitTransactionButton>,
  ) => ReactElement<typeof SplitTransactionButton>;
  renderCategoryItemGroupHeader?: (
    props: ComponentPropsWithoutRef<typeof ItemHeader>,
  ) => ReactElement<typeof ItemHeader>;
  renderCategoryItem?: (
    props: ComponentPropsWithoutRef<typeof CategoryItem>,
  ) => ReactElement<typeof CategoryItem>;
  showHiddenItems?: boolean;
};
function CategoryList({
  items,
  getItemProps,
  highlightedIndex,
  embedded,
  footer,
  renderSplitTransactionButton = defaultRenderSplitTransactionButton,
  renderCategoryItemGroupHeader = defaultRenderCategoryItemGroupHeader,
  renderCategoryItem = defaultRenderCategoryItem,
  showHiddenItems,
}: CategoryListProps) {
  let lastGroup: string | undefined | null = null;

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
            return renderSplitTransactionButton({
              key: 'split',
              ...(getItemProps ? getItemProps({ item }) : null),
              highlighted: highlightedIndex === idx,
              embedded,
            });
          }

          if ((item.hidden || item.group?.hidden) && !showHiddenItems) {
            return <Fragment key={item.id} />;
          }

          const showGroup = item.cat_group !== lastGroup;
          const groupName = `${item.group?.name}${item.group?.hidden ? ' (hidden)' : ''}`;
          lastGroup = item.cat_group;
          return (
            <Fragment key={item.id}>
              {showGroup && item.group?.name && (
                <Fragment key={item.group.name}>
                  {renderCategoryItemGroupHeader({
                    title: groupName,
                    style: {
                      ...(showHiddenItems &&
                        item.group?.hidden && { color: theme.pageTextSubdued }),
                    },
                  })}
                </Fragment>
              )}
              <Fragment key={item.id}>
                {renderCategoryItem({
                  ...(getItemProps ? getItemProps({ item }) : null),
                  item,
                  highlighted: highlightedIndex === idx,
                  embedded,
                  style: {
                    ...(showHiddenItems &&
                      item.hidden && { color: theme.pageTextSubdued }),
                  },
                })}
              </Fragment>
            </Fragment>
          );
        })}
      </View>
      {footer}
    </View>
  );
}

type CategoryAutocompleteProps = ComponentProps<
  typeof Autocomplete<CategoryAutocompleteItem>
> & {
  categoryGroups: Array<CategoryGroupEntity>;
  showSplitOption?: boolean;
  renderSplitTransactionButton?: (
    props: ComponentPropsWithoutRef<typeof SplitTransactionButton>,
  ) => ReactElement<typeof SplitTransactionButton>;
  renderCategoryItemGroupHeader?: (
    props: ComponentPropsWithoutRef<typeof ItemHeader>,
  ) => ReactElement<typeof ItemHeader>;
  renderCategoryItem?: (
    props: ComponentPropsWithoutRef<typeof CategoryItem>,
  ) => ReactElement<typeof CategoryItem>;
  showHiddenCategories?: boolean;
};

export function CategoryAutocomplete({
  categoryGroups,
  showSplitOption,
  embedded,
  closeOnBlur,
  renderSplitTransactionButton,
  renderCategoryItemGroupHeader,
  renderCategoryItem,
  showHiddenCategories,
  ...props
}: CategoryAutocompleteProps) {
  const categorySuggestions: CategoryAutocompleteItem[] = useMemo(
    () =>
      categoryGroups.reduce(
        (list, group) =>
          list.concat(
            (group.categories || [])
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
    <Autocomplete<CategoryAutocompleteItem>
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
          renderSplitTransactionButton={renderSplitTransactionButton}
          renderCategoryItemGroupHeader={renderCategoryItemGroupHeader}
          renderCategoryItem={renderCategoryItem}
          showHiddenItems={showHiddenCategories}
        />
      )}
      {...props}
    />
  );
}

function defaultRenderCategoryItemGroupHeader(
  props: ComponentPropsWithoutRef<typeof ItemHeader>,
): ReactElement<typeof ItemHeader> {
  return <ItemHeader {...props} type="category" />;
}

type SplitTransactionButtonProps = {
  Icon?: ComponentType<SVGProps<SVGElement>>;
  highlighted?: boolean;
  embedded?: boolean;
  style?: CSSProperties;
};

function SplitTransactionButton({
  Icon,
  highlighted,
  embedded,
  style,
  ...props
}: SplitTransactionButtonProps) {
  const { isNarrowWidth } = useResponsive();
  return (
    <View
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
        backgroundColor: highlighted
          ? embedded && isNarrowWidth
            ? theme.menuItemBackgroundHover
            : theme.menuAutoCompleteBackgroundHover
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
        ...style,
      }}
      data-testid="split-transaction-button"
      {...props}
    >
      <Text style={{ lineHeight: 0 }}>
        {Icon ? (
          <Icon style={{ marginRight: 5 }} />
        ) : (
          <SvgSplit width={10} height={10} style={{ marginRight: 5 }} />
        )}
      </Text>
      Split Transaction
    </View>
  );
}

function defaultRenderSplitTransactionButton(
  props: SplitTransactionButtonProps,
): ReactElement<typeof SplitTransactionButton> {
  return <SplitTransactionButton {...props} />;
}

type CategoryItemProps = {
  item: CategoryAutocompleteItem;
  className?: string;
  style?: CSSProperties;
  highlighted?: boolean;
  embedded?: boolean;
};

// eslint-disable-next-line import/no-unused-modules
export function CategoryItem({
  item,
  className,
  style,
  highlighted,
  embedded,
  ...props
}: CategoryItemProps) {
  const { isNarrowWidth } = useResponsive();
  const narrowStyle = isNarrowWidth
    ? {
        ...styles.mobileMenuItem,
        color: theme.menuItemText,
        borderRadius: 0,
        borderTop: `1px solid ${theme.pillBorder}`,
      }
    : {};

  return (
    <div
      style={style}
      // See comment above.
      role="button"
      className={`${className} ${css([
        {
          backgroundColor: highlighted
            ? embedded && isNarrowWidth
              ? theme.menuItemBackgroundHover
              : theme.menuAutoCompleteBackgroundHover
            : 'transparent',
          padding: 4,
          paddingLeft: 20,
          borderRadius: embedded ? 4 : 0,
          ...narrowStyle,
        },
      ])}`}
      data-testid={`${item.name}-category-item`}
      data-highlighted={highlighted || undefined}
      {...props}
    >
      <TextOneLine>
        {item.name}
        {item.hidden ? ' (hidden)' : null}
      </TextOneLine>
    </div>
  );
}

function defaultRenderCategoryItem(
  props: ComponentPropsWithoutRef<typeof CategoryItem>,
): ReactElement<typeof CategoryItem> {
  return <CategoryItem {...props} />;
}
