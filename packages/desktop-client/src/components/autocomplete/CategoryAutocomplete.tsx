import React, { Fragment, useMemo, useState } from 'react';
import type {
  ComponentProps,
  ComponentPropsWithoutRef,
  ComponentType,
  CSSProperties,
  ReactElement,
  ReactNode,
  SVGProps,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgSplit } from '@actual-app/components/icons/v0';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { TextOneLine } from '@actual-app/components/text-one-line';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { getNormalisedString } from '@actual-app/core/shared/normalisation';
import { integerToCurrency } from '@actual-app/core/shared/util';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';
import { css, cx } from '@emotion/css';

import { useCreateCategoryMutation } from '#budget/mutations';
import { useEnvelopeSheetValue } from '#components/budget/envelope/EnvelopeBudgetComponents';
import { makeAmountFullStyle } from '#components/budget/util';
import { FinancialText } from '#components/FinancialText';
import { useCategories } from '#hooks/useCategories';
import { useSheetValue } from '#hooks/useSheetValue';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { envelopeBudget, trackingBudget } from '#spreadsheet/bindings';

import { Autocomplete } from './Autocomplete';
import { filterCategorySuggestions } from './filterCategorySuggestions';
import { ItemHeader } from './ItemHeader';

type CategoryAutocompleteItem = Omit<CategoryEntity, 'group'> & {
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
  renderCategoryItemGroupHeader?: (
    props: ComponentPropsWithoutRef<typeof ItemHeader>,
  ) => ReactElement<typeof ItemHeader>;
  renderCategoryItem?: (
    props: ComponentPropsWithoutRef<typeof CategoryItem>,
  ) => ReactElement<typeof CategoryItem>;
  renderCreateCategoryButton?: (
    props: ComponentPropsWithoutRef<typeof CreateCategoryButton>,
  ) => ReactElement<typeof CreateCategoryButton>;
  showHiddenItems?: boolean;
  showBalances?: boolean;
  /** Name typed by the user, shown on the "create category" row. */
  createCategoryName?: string;
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
  renderCreateCategoryButton = defaultRenderCreateCategoryButton,
  showHiddenItems,
  showBalances,
  createCategoryName,
}: CategoryListProps) {
  const { t } = useTranslation();
  const splitTransactionIndex = items.findIndex(item => item.id === 'split');
  const splitTransaction =
    splitTransactionIndex === -1
      ? null
      : {
          ...items[splitTransactionIndex],
          highlightedIndex: splitTransactionIndex,
        };
  // Like the split row, the create row has no group and so must be pulled out
  // before the grouped rendering below (which skips groupless items).
  const createIndex = items.findIndex(item => item.id === 'new');
  const createItem =
    createIndex === -1
      ? null
      : { ...items[createIndex], highlightedIndex: createIndex };
  const categoryItems = items
    .map((item, index) => ({ ...item, highlightedIndex: index }))
    .filter(item => item.id !== 'split' && item.id !== 'new');

  return (
    <View>
      <View
        style={{
          overflowY: 'auto',
          willChange: 'transform',
          padding: '5px 0',
          ...(!embedded && { maxHeight: 175 }),
        }}
      >
        {splitTransaction &&
          (() => {
            const splitButtonProps = getItemProps
              ? getItemProps({ item: splitTransaction })
              : {};
            const { onClick, ...restSplitButtonProps } = splitButtonProps;
            return renderSplitTransactionButton({
              key: 'split',
              ...restSplitButtonProps,
              onClick,
              highlighted:
                splitTransaction.highlightedIndex === highlightedIndex,
              embedded,
            });
          })()}
        {categoryItems.map((item, index) => {
          const group = item.group;

          if (!group) {
            return null;
          }

          const previousGroup = categoryItems[index - 1]?.group;
          const showGroupHeader = previousGroup?.id !== group.id;

          return (
            <Fragment key={item.id}>
              {showGroupHeader &&
                renderCategoryItemGroupHeader({
                  title: `${group.name}${group.hidden ? ` ${t('(hidden)')}` : ''}`,
                  style: {
                    ...(showHiddenItems &&
                      group.hidden && { color: theme.pageTextSubdued }),
                  },
                })}
              {renderCategoryItem({
                ...(getItemProps ? getItemProps({ item }) : {}),
                item,
                highlighted: highlightedIndex === item.highlightedIndex,
                embedded,
                style: {
                  ...(showHiddenItems &&
                    (item.hidden || group.hidden) && {
                      color: theme.pageTextSubdued,
                    }),
                },
                showBalances,
              })}
            </Fragment>
          );
        })}
        {createItem &&
          (() => {
            const createButtonProps = getItemProps
              ? getItemProps({ item: createItem })
              : {};
            const { onClick, ...restCreateButtonProps } = createButtonProps;
            return renderCreateCategoryButton({
              ...restCreateButtonProps,
              onClick,
              categoryName: createCategoryName ?? '',
              highlighted: createItem.highlightedIndex === highlightedIndex,
              embedded,
            });
          })()}
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
  renderCategoryItemGroupHeader?: (
    props: ComponentPropsWithoutRef<typeof ItemHeader>,
  ) => ReactElement<typeof ItemHeader>;
  renderCategoryItem?: (
    props: ComponentPropsWithoutRef<typeof CategoryItem>,
  ) => ReactElement<typeof CategoryItem>;
  renderCreateCategoryButton?: (
    props: ComponentPropsWithoutRef<typeof CreateCategoryButton>,
  ) => ReactElement<typeof CreateCategoryButton>;
  showHiddenCategories?: boolean;
  /**
   * Offer a opt-in "Create category" row when what the user typed doesn't match an
   * existing category.
   */
  showCreateOption?: boolean;
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
  renderCreateCategoryButton,
  showHiddenCategories,
  showCreateOption,
  inputProps,
  ...props
}: CategoryAutocompleteProps) {
  const { t } = useTranslation();
  const { data: { grouped: defaultCategoryGroups } = { grouped: [] } } =
    useCategories();
  const createCategoryMutation = useCreateCategoryMutation();

  const groups = categoryGroups || defaultCategoryGroups;

  // Non-null while the second step is showing: the name to create, waiting on
  // the user to pick a group. Creating a category requires a group, so unlike
  // payees it can't be a single action.
  const [pendingName, setPendingName] = useState<string | null>(null);
  const isChoosingGroup = pendingName !== null;

  // Tracked so the create row can echo what was typed.
  const [rawInput, setRawInput] = useState('');

  // `category-create` only invalidates the categories query, so a category we
  // just made isn't in `useCategories()` for another render or two. Autocomplete
  // resolves its display text by looking the selected id up in `suggestions`
  // (and returns null in strict mode when it misses), so without this stand-in
  // the field goes blank right after creating. Dropped as soon as the real list
  // catches up.
  const [createdCategory, setCreatedCategory] =
    useState<CategoryAutocompleteItem | null>(null);

  const categorySuggestions: CategoryAutocompleteItem[] = useMemo(() => {
    const allSuggestions = groups.reduce(
      (list, group) =>
        list.concat(
          (group.categories || [])
            .filter(category => category.group === group.id)
            .map(category => ({
              ...category,
              group,
            })),
        ),
      showSplitOption
        ? [{ id: 'split', name: '' } as CategoryAutocompleteItem]
        : [],
    );

    const visibleSuggestions = showHiddenCategories
      ? allSuggestions
      : allSuggestions.filter(
          suggestion =>
            suggestion.id === 'split' ||
            (!suggestion.hidden && !suggestion.group?.hidden),
        );

    if (
      createdCategory &&
      !visibleSuggestions.some(
        suggestion => suggestion.id === createdCategory.id,
      )
    ) {
      return [...visibleSuggestions, createdCategory];
    }

    return visibleSuggestions;
  }, [groups, showSplitOption, showHiddenCategories, createdCategory]);

  // Second step: the same input now filters groups instead of categories.
  const groupSuggestions: CategoryAutocompleteItem[] = useMemo(
    () =>
      groups
        .filter(group => showHiddenCategories || !group.hidden)
        .map(group => ({ id: group.id, name: group.name })),
    [groups, showHiddenCategories],
  );

  // The create row is filtered out again unless the user has typed something
  // that doesn't already exist — see filterSuggestions below.
  const suggestions = isChoosingGroup
    ? groupSuggestions
    : showCreateOption && rawInput.trim() !== ''
      ? [
          ...categorySuggestions,
          { id: 'new', name: '' } as CategoryAutocompleteItem,
        ]
      : categorySuggestions;

  // `CategoryAutocompleteProps` is a union of the single- and multi-select
  // Autocomplete props, so the destructured `onSelect` has an unusable
  // intersection signature. Categories are always single-select here.
  type SelectHandler = (id: string, value: string) => void;
  const onSelectSingle = props.onSelect as SelectHandler | undefined;

  const handleSelect: SelectHandler = (id, value) => {
    if (isChoosingGroup) {
      const name = pendingName;
      if (!name) {
        return;
      }
      const group = groups.find(g => g.id === id);
      void createCategoryMutation
        .mutateAsync({
          name,
          groupId: id,
          isIncome: !!group?.is_income,
          isHidden: false,
        })
        .then(categoryId => {
          setCreatedCategory({
            id: categoryId,
            name,
            group: group ?? undefined,
            is_income: !!group?.is_income,
            hidden: false,
          });
          setPendingName(null);
          onSelectSingle?.(categoryId, name);
        })
        .catch(() => {
          // The mutation's own onError raises the notification, so there is
          // nothing to report here. The group step is deliberately left open:
          // picking a group again retries, and the typed name survives. Blur
          // clears it either way.
        });
      return;
    }

    if (id === 'new') {
      // Hold the name and switch to the group picker instead of selecting.
      setPendingName(rawInput.trim());
      return;
    }

    onSelectSingle?.(id, value);
  };

  const filterSuggestions = (
    items: CategoryAutocompleteItem[],
    value: string,
  ) => {
    if (isChoosingGroup) {
      // Group items carry no `group`, so this ranks them by name.
      return filterCategorySuggestions(items, value);
    }

    const createItem = items.find(item => item.id === 'new');
    const filtered = filterCategorySuggestions(
      items.filter(item => item.id !== 'new'),
      value,
    );

    if (!createItem || !value) {
      return filtered;
    }

    // Nothing to create when the typed name already exists.
    const hasExactMatch = filtered.some(
      item =>
        item.id !== 'split' &&
        getNormalisedString(item.name) === getNormalisedString(value),
    );

    return hasExactMatch ? filtered : [...filtered, createItem];
  };

  // `AutocompleteProps` is a union of the single- and multi-select shapes, and
  // TS cannot resolve which member a spread satisfies once onSelect is
  // overridden. Merge and assert once here; categories are single-select.
  const autocompleteProps = {
    ...props,
    onSelect: handleSelect,
  } as CategoryAutocompleteProps;

  return (
    <Autocomplete
      // Remount when switching steps so the input and highlight reset, the
      // same way PayeeAutocomplete swaps in transfer payees.
      key={isChoosingGroup ? 'groups' : 'categories'}
      strict
      highlightFirst
      embedded={embedded}
      closeOnBlur={closeOnBlur}
      itemToString={item => {
        if (!item) {
          return '';
        }
        return item.id === 'new' ? rawInput : item.name;
      }}
      inputProps={{
        ...inputProps,
        ...(isChoosingGroup && {
          placeholder: t('Choose a group for "{{name}}"', {
            name: pendingName,
          }),
        }),
        onChangeValue: (value, event) => {
          setRawInput(value);
          inputProps?.onChangeValue?.(value, event);
        },
        onBlur: event => {
          setPendingName(null);
          inputProps?.onBlur?.(event);
        },
      }}
      getHighlightedIndex={items => {
        if (items.length === 0) {
          return null;
        } else if (items[0].id === 'split') {
          // Highlight the first category since the split option is at index 0.
          return items.length > 1 ? 1 : null;
        }
        return 0;
      }}
      filterSuggestions={filterSuggestions}
      suggestions={suggestions}
      renderItems={(items, getItemProps, highlightedIndex) =>
        isChoosingGroup ? (
          <CategoryGroupChoiceList
            items={items}
            embedded={embedded}
            getItemProps={getItemProps}
            highlightedIndex={highlightedIndex}
            renderCategoryItemGroupHeader={renderCategoryItemGroupHeader}
          />
        ) : (
          <CategoryList
            items={items}
            embedded={embedded}
            getItemProps={getItemProps}
            highlightedIndex={highlightedIndex}
            renderSplitTransactionButton={renderSplitTransactionButton}
            renderCategoryItemGroupHeader={renderCategoryItemGroupHeader}
            renderCategoryItem={renderCategoryItem}
            renderCreateCategoryButton={renderCreateCategoryButton}
            showHiddenItems={showHiddenCategories}
            showBalances={showBalances && !isChoosingGroup}
            createCategoryName={rawInput}
          />
        )
      }
      {...autocompleteProps}
    />
  );
}

function defaultRenderCategoryItemGroupHeader(
  props: ComponentPropsWithoutRef<typeof ItemHeader>,
): ReactElement<typeof ItemHeader> {
  return <ItemHeader {...props} type="category" />;
}

type CategoryGroupChoiceListProps = {
  items: CategoryAutocompleteItem[];
  getItemProps?: (arg: {
    item: CategoryAutocompleteItem;
  }) => Partial<ComponentProps<typeof View>>;
  highlightedIndex: number;
  embedded?: boolean;
  renderCategoryItemGroupHeader?: (
    props: ComponentPropsWithoutRef<typeof ItemHeader>,
  ) => ReactElement<typeof ItemHeader>;
};

/**
 * Second step of creating a category: pick the group it belongs to. Rendered
 * separately from CategoryList because these rows are groups, not categories,
 * so they have no group of their own to be listed under.
 */
function CategoryGroupChoiceList({
  items,
  getItemProps,
  highlightedIndex,
  embedded,
  renderCategoryItemGroupHeader = defaultRenderCategoryItemGroupHeader,
}: CategoryGroupChoiceListProps) {
  const { t } = useTranslation();

  return (
    <View>
      <View
        style={{
          overflowY: 'auto',
          willChange: 'transform',
          padding: '5px 0',
          ...(!embedded && { maxHeight: 175 }),
        }}
      >
        {renderCategoryItemGroupHeader({ title: t('Choose a group') })}
        {items.map((item, index) => (
          <CategoryGroupChoiceItem
            key={item.id}
            {...(getItemProps ? getItemProps({ item }) : {})}
            item={item}
            highlighted={highlightedIndex === index}
            embedded={embedded}
          />
        ))}
      </View>
    </View>
  );
}

type CategoryGroupChoiceItemProps = {
  item: CategoryAutocompleteItem;
  className?: string;
  style?: CSSProperties;
  highlighted?: boolean;
  embedded?: boolean;
};

function CategoryGroupChoiceItem({
  item,
  className,
  style,
  highlighted,
  embedded,
  ...props
}: CategoryGroupChoiceItemProps) {
  const { isNarrowWidth } = useResponsive();
  const narrowStyle = isNarrowWidth
    ? {
        ...styles.mobileMenuItem,
        borderRadius: 0,
        borderTop: `1px solid ${theme.pillBorder}`,
      }
    : {};

  return (
    <button
      type="button"
      style={style}
      className={cx(
        className,
        css({
          backgroundColor: highlighted
            ? theme.menuAutoCompleteBackgroundHover
            : 'transparent',
          color: highlighted
            ? theme.menuAutoCompleteItemTextHover
            : theme.menuAutoCompleteItemText,
          padding: 4,
          paddingLeft: 20,
          borderRadius: embedded ? 4 : 0,
          border: 'none',
          font: 'inherit',
          textAlign: 'left',
          ...narrowStyle,
        }),
      )}
      data-testid={`${item.name}-category-group-item`}
      data-highlighted={highlighted || undefined}
      {...props}
    >
      <TextOneLine>{item.name}</TextOneLine>
    </button>
  );
}

type SplitTransactionButtonProps = ComponentPropsWithoutRef<typeof View> & {
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
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
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
      <Trans>Split Transaction</Trans>
    </View>
  );
}

function defaultRenderSplitTransactionButton(
  props: SplitTransactionButtonProps,
): ReactElement<typeof SplitTransactionButton> {
  return <SplitTransactionButton {...props} />;
}

type CreateCategoryButtonProps = ComponentPropsWithoutRef<typeof View> & {
  Icon?: ComponentType<SVGProps<SVGElement>>;
  categoryName: string;
  highlighted?: boolean;
  embedded?: boolean;
  style?: CSSProperties;
};

export function CreateCategoryButton({
  Icon,
  categoryName,
  highlighted,
  embedded,
  style,
  ...props
}: CreateCategoryButtonProps) {
  const { isNarrowWidth } = useResponsive();
  const narrowStyle = isNarrowWidth ? { ...styles.mobileMenuItem } : {};
  const iconSize = isNarrowWidth ? 14 : 8;

  return (
    <View
      // See the comment on SplitTransactionButton: the aria role avoids
      // WebKit's tap delay on touch devices.
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="button"
      data-testid="create-category-button"
      style={{
        display: 'block',
        flex: '1 0',
        color: highlighted
          ? theme.menuAutoCompleteTextHover
          : theme.noticeTextMenu,
        borderRadius: embedded ? 4 : 0,
        fontSize: 11,
        fontWeight: 500,
        padding: '6px 9px',
        backgroundColor: highlighted
          ? theme.menuAutoCompleteBackgroundHover
          : 'transparent',
        ':active': {
          backgroundColor: 'rgba(100, 100, 100, .25)',
        },
        ...narrowStyle,
        ...style,
      }}
      {...props}
    >
      {Icon ? (
        <Icon style={{ marginRight: 5, display: 'inline-block' }} />
      ) : (
        <SvgAdd
          width={iconSize}
          height={iconSize}
          style={{ marginRight: 5, display: 'inline-block' }}
        />
      )}
      <Trans>Create category "{{ categoryName }}"</Trans>
    </View>
  );
}

function defaultRenderCreateCategoryButton(
  props: ComponentPropsWithoutRef<typeof CreateCategoryButton>,
): ReactElement<typeof CreateCategoryButton> {
  return <CreateCategoryButton {...props} />;
}

type CategoryItemProps = {
  item: CategoryAutocompleteItem;
  className?: string;
  style?: CSSProperties;
  highlighted?: boolean;
  embedded?: boolean;
  showBalances?: boolean;
};

function CategoryItem({
  item,
  className,
  style,
  highlighted,
  embedded,
  showBalances,
  ...props
}: CategoryItemProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const narrowStyle = isNarrowWidth
    ? {
        ...styles.mobileMenuItem,
        borderRadius: 0,
        borderTop: `1px solid ${theme.pillBorder}`,
      }
    : {};
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');

  const balanceBinding =
    budgetType === 'envelope'
      ? envelopeBudget.catBalance(item.id)
      : trackingBudget.catBalance(item.id);
  const balance = useSheetValue<
    'envelope-budget' | 'tracking-budget',
    typeof balanceBinding
  >(balanceBinding);

  const isToBudgetItem = item.id === 'to-budget';
  const toBudget = useEnvelopeSheetValue(envelopeBudget.toBudget);

  return (
    <button
      type="button"
      style={style}
      // See comment above.
      className={cx(
        className,
        css({
          backgroundColor: highlighted
            ? theme.menuAutoCompleteBackgroundHover
            : 'transparent',
          color: highlighted
            ? theme.menuAutoCompleteItemTextHover
            : theme.menuAutoCompleteItemText,
          padding: 4,
          paddingLeft: 20,
          borderRadius: embedded ? 4 : 0,
          border: 'none',
          font: 'inherit',
          ...narrowStyle,
        }),
      )}
      data-testid={`${item.name}-category-item`}
      data-highlighted={highlighted || undefined}
      {...props}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <TextOneLine>
          {item.name}
          {item.hidden || item.group?.hidden ? ' ' + t('(hidden)') : ''}
        </TextOneLine>
        <TextOneLine
          style={{
            display: !showBalances ? 'none' : undefined,
            marginLeft: 5,
            flexShrink: 0,
            ...makeAmountFullStyle((isToBudgetItem ? toBudget : balance) || 0, {
              positiveColor: theme.noticeTextMenu,
              negativeColor: theme.errorTextMenu,
            }),
          }}
        >
          {isToBudgetItem
            ? toBudget != null && (
                <>
                  {' '}
                  <FinancialText>
                    {integerToCurrency(toBudget || 0)}
                  </FinancialText>
                </>
              )
            : balance != null && (
                <>
                  {' '}
                  <FinancialText>
                    {integerToCurrency(balance || 0)}
                  </FinancialText>
                </>
              )}
        </TextOneLine>
      </View>
    </button>
  );
}

function defaultRenderCategoryItem(
  props: ComponentPropsWithoutRef<typeof CategoryItem>,
): ReactElement<typeof CategoryItem> {
  return <CategoryItem {...props} />;
}
