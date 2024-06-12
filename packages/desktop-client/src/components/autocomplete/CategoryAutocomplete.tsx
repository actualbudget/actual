import React, {
  type ComponentProps,
  Fragment,
  useMemo,
  type ReactNode,
  type SVGProps,
  type ComponentType,
  type ComponentPropsWithoutRef,
  type ReactElement,
  useState,
} from 'react';

import { css } from 'glamor';

import { reportBudget, rolloverBudget } from 'loot-core/client/queries';
import { integerToCurrency } from 'loot-core/shared/util';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/src/types/models';

import { useCategories } from '../../hooks/useCategories';
import { useLocalPref } from '../../hooks/useLocalPref';
import { SvgLeftArrow2, SvgSplit } from '../../icons/v0';
import { useResponsive } from '../../ResponsiveProvider';
import { type CSSProperties, theme, styles } from '../../style';
import { makeAmountFullStyle } from '../budget/util';
import { Text } from '../common/Text';
import { TextOneLine } from '../common/TextOneLine';
import { View } from '../common/View';
import { useSheetValue } from '../spreadsheet/useSheetValue';

import { Autocomplete, defaultFilterSuggestion } from './Autocomplete';
import { ItemHeader } from './ItemHeader';

type CategoryAutocompleteItem = CategoryEntity & {
  group?: CategoryGroupEntity;
};

type CategoryListProps = {
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
  renderClearFilterButton?: (
    props: ComponentPropsWithoutRef<typeof ClearFilterButton>,
  ) => ReactElement<typeof ClearFilterButton>;
  renderCategoryItemGroupHeader?: (
    props: ComponentPropsWithoutRef<typeof ItemHeader>,
  ) => ReactElement<typeof ItemHeader>;
  renderCategoryItem?: (
    props: ComponentPropsWithoutRef<typeof CategoryItem>,
  ) => ReactElement<typeof CategoryItem>;
  showHiddenItems?: boolean;
  showBalances?: boolean;
};
function CategoryList({
  items,
  getItemProps,
  highlightedIndex,
  embedded,
  footer,
  renderSplitTransactionButton = defaultRenderSplitTransactionButton,
  renderCategoryItem = defaultRenderCategoryItem,
  renderClearFilterButton = defaultRenderClearFilterButton,
  showHiddenItems,
  showBalances,
}: CategoryListProps) {
  let lastGroup: string | undefined | null = null;

  const filteredItems = useMemo(
    () =>
      showHiddenItems
        ? items
        : items.filter(item => !item.hidden && !item.group?.hidden),
    [showHiddenItems, items],
  );

  return (
    <View>
      <View
        style={{
          overflow: 'auto',
          padding: '5px 0',
          ...(!embedded && { maxHeight: 175 }),
        }}
      >
        {filteredItems.map((item, idx) => {
          if (item.id === 'split') {
            return renderSplitTransactionButton({
              key: 'split',
              ...(getItemProps ? getItemProps({ item }) : null),
              highlighted: highlightedIndex === idx,
              embedded,
            });
          }

          if (item.id === 'clearFilter') {
            return renderClearFilterButton({
              key: 'clearFilter',
              ...(getItemProps ? getItemProps({ item }) : null),
              highlighted: highlightedIndex === idx,
              embedded,
            })
          }

          const showGroup = item.is_group;
          const groupName = `${item.group?.name}${item.group?.hidden ? ' (hidden)' : ''}`;
          lastGroup = item.cat_group;
          return (
            <Fragment key={item.id}>
              {
                (<Fragment key={item.id}>
                {renderCategoryItem({
                  ...(getItemProps ? getItemProps({ item }) : null),
                  item,
                  highlighted: highlightedIndex === idx,
                  embedded,
                  isHeader: item.is_group,
                  style: {
                    ...(showHiddenItems &&
                      item.hidden && { color: theme.pageTextSubdued }),
                  },
                  showBalances,
                })}
                </Fragment>
                )}
              
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
  categoryGroups?: Array<CategoryGroupEntity>;
  showBalances?: boolean;
  showSplitOption?: boolean;
  renderSplitTransactionButton?: (
    props: ComponentPropsWithoutRef<typeof SplitTransactionButton>,
  ) => ReactElement<typeof SplitTransactionButton>;
  renderClearFilterButton?: (
    props: ComponentPropsWithoutRef<typeof ClearFilterButton>,
  ) => ReactElement<typeof ClearFilterButton>;
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
  showBalances = true,
  showSplitOption,
  embedded,
  closeOnBlur,
  renderSplitTransactionButton,
  renderCategoryItemGroupHeader,
  renderCategoryItem,
  renderClearFilterButton,
  showHiddenCategories,
  ...props
}: CategoryAutocompleteProps) {
  const { grouped: defaultCategoryGroups = [] } = useCategories();
  const [filteredCategories, setFilteredCategories] = useState<CategoryAutocompleteItem[]>([]);

  const categorySuggestions: CategoryAutocompleteItem[] = useMemo(
    () => {
      return (filteredCategories.length > 0 && filteredCategories ) ||
      (categoryGroups || defaultCategoryGroups).reduce(
        (list, group) =>
          list.concat({...group, is_group: true})
              .concat(
            (group.categories || [])
              .filter(category => category.cat_group === group.id)
              .map(category => ({
                ...category,
                group,
              })),
          ),
        showSplitOption ? [{ id: 'split', name: '' } as CategoryEntity] : [],
      )
    },
    [defaultCategoryGroups, categoryGroups, showSplitOption, filteredCategories],
  );

  return (
    <Autocomplete
      strict={true}
      highlightFirst={true}
      embedded={embedded}
      closeOnBlur={closeOnBlur}
      onClose={() => setFilteredCategories([])}
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
      customOnSelect={(item: CategoryAutocompleteItem, _) => {
        if (item.id == 'clearFilter') {
          setFilteredCategories([]);
          return false;

        } else if (item.is_group) {
          const newFilteredCategories = [...categoryGroups.find(group => group.id === item.id)?.categories];
          newFilteredCategories.unshift({ id: 'clearFilter', name: '' } as CategoryEntity);
          setFilteredCategories(newFilteredCategories);
          return false;
        }

        setFilteredCategories([]);
        return true;
      }}
      renderItems={(items, getItemProps, highlightedIndex) => (
        <CategoryList
          items={items}
          embedded={embedded}
          getItemProps={getItemProps}
          highlightedIndex={highlightedIndex}
          renderSplitTransactionButton={renderSplitTransactionButton}
          renderCategoryItemGroupHeader={renderCategoryItemGroupHeader}
          renderCategoryItem={renderCategoryItem}
          renderClearFilterButton={renderClearFilterButton}
          showHiddenItems={showHiddenCategories}
          showBalances={showBalances}
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

type ClearFilterButtonProps = {
  Icon?: ComponentType<SVGProps<SVGElement>>;
  highlighted?: boolean;
  embedded?: boolean;
  style?: CSSProperties;
};

function ClearFilterButton({
  Icon,
  highlighted,
  embedded,
  style,
  ...props
}: ClearFilterButtonProps) {
  return (<View
    role="button"
    style={{
      backgroundColor: highlighted
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
      ...style,
    }}
    data-testid="clear-filter-button"
    {...props}
  >
    <Text style={{ lineHeight: 0 }}>
      {Icon ? (
        <Icon style={{ marginRight: 5 }} />
      ) : (
        <SvgLeftArrow2 width={10} height={10} style={{ marginRight: 5 }} />
      )}
    </Text>
    Clear Filter
  </View>)
}

function defaultRenderClearFilterButton(
  props: ClearFilterButtonProps,
): ReactElement<typeof ClearFilterButton> {
  return <ClearFilterButton {...props} />;
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
  showBalances?: boolean;
  isHeader?: boolean;
};

function CategoryItem({
  item,
  className,
  style,
  highlighted,
  embedded,
  showBalances,
  isHeader,
  ...props
}: CategoryItemProps) {
  const { isNarrowWidth } = useResponsive();
  const narrowStyle = isNarrowWidth
    ? {
        ...styles.mobileMenuItem,
        borderRadius: 0,
        borderTop: `1px solid ${theme.pillBorder}`,
      }
    : {};
  const [budgetType] = useLocalPref('budgetType');

  const balance = useSheetValue(
    budgetType === 'rollover'
      ? rolloverBudget.catBalance(item.id)
      : reportBudget.catBalance(item.id),
  );

  const isToBeBudgetedItem = item.id === 'to-be-budgeted';
  const toBudget = useSheetValue(rolloverBudget.toBudget);

  return (
    <div
      style={style}
      // See comment above.
      role="button"
      className={`${className} ${css([
        {
          backgroundColor: highlighted
            ? theme.menuAutoCompleteBackgroundHover
            : 'transparent',
          color: isHeader ? theme.menuAutoCompleteTextHeader :
                            (highlighted
                              ? theme.menuAutoCompleteItemTextHover
                              : theme.menuAutoCompleteItemText),
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <TextOneLine>
          {item.name}
          {item.hidden ? ' (hidden)' : null}
        </TextOneLine>
        <TextOneLine
          style={{
            display: !showBalances ? 'none' : undefined,
            marginLeft: 5,
            flexShrink: 0,
            ...makeAmountFullStyle(isToBeBudgetedItem ? toBudget : balance, {
              positiveColor: theme.noticeTextMenu,
              negativeColor: theme.errorTextMenu,
            }),
          }}
        >
          {isToBeBudgetedItem
            ? toBudget != null
              ? ` ${integerToCurrency(toBudget || 0)}`
              : null
            : balance != null
              ? ` ${integerToCurrency(balance || 0)}`
              : null}
        </TextOneLine>
      </View>
    </div>
  );
}

function defaultRenderCategoryItem(
  props: ComponentPropsWithoutRef<typeof CategoryItem>,
): ReactElement<typeof CategoryItem> {
  return <CategoryItem {...props} />;
}
