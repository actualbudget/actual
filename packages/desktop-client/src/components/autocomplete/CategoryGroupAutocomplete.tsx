import React, { Fragment, useMemo } from 'react';
import type {
  ComponentProps,
  ComponentPropsWithoutRef,
  CSSProperties,
  ReactElement,
  ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { TextOneLine } from '@actual-app/components/text-one-line';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

import type { CategoryGroupEntity } from 'loot-core/types/models';

import { Autocomplete } from './Autocomplete';

import { useCategories } from '@desktop-client/hooks/useCategories';

type CategoryGroupAutocompleteItem = CategoryGroupEntity;

type CategoryGroupListProps = {
  items: CategoryGroupAutocompleteItem[];
  getItemProps?: (arg: {
    item: CategoryGroupAutocompleteItem;
  }) => Partial<ComponentProps<typeof View>>;
  highlightedIndex: number;
  embedded?: boolean;
  footer?: ReactNode;
  renderCategoryGroupItem?: (
    props: ComponentPropsWithoutRef<typeof CategoryGroupItem>,
  ) => ReactElement<typeof CategoryGroupItem>;
  showHiddenItems?: boolean;
};

function CategoryGroupList({
  items,
  getItemProps,
  highlightedIndex,
  embedded,
  footer,
  renderCategoryGroupItem = defaultRenderCategoryItem,
  showHiddenItems,
}: CategoryGroupListProps) {
  const categoryGroups = useMemo(() => {
    return items.reduce<
      (CategoryGroupAutocompleteItem & { highlightedIndex: number })[]
    >((acc, item, index) => {
      const itemWithIndex = {
        ...item,
        highlightedIndex: index,
      };

      acc.push(itemWithIndex);

      return acc;
    }, []);
  }, [items]);

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
        {categoryGroups.map(item => (
          <Fragment key={item.id}>
            {renderCategoryGroupItem({
              ...(getItemProps ? getItemProps({ item }) : {}),
              item,
              highlighted: highlightedIndex === item.highlightedIndex,
              embedded,
              style: {
                ...(showHiddenItems &&
                  item.hidden && {
                    color: theme.pageTextSubdued,
                  }),
              },
            })}
          </Fragment>
        ))}
      </View>
      {footer}
    </View>
  );
}

type CategoryGroupAutocompleteProps = ComponentProps<
  typeof Autocomplete<CategoryGroupAutocompleteItem>
> & {
  categoryGroups?: Array<CategoryGroupEntity>;
  renderCategoryGroupItem?: (
    props: ComponentPropsWithoutRef<typeof CategoryGroupItem>,
  ) => ReactElement<typeof CategoryGroupItem>;
  showHiddenCategories?: boolean;
};

export function CategoryGroupAutocomplete({
  categoryGroups,
  embedded,
  closeOnBlur,
  renderCategoryGroupItem,
  showHiddenCategories,
  ...props
}: CategoryGroupAutocompleteProps) {
  const {
    data: { grouped: defaultCategoryGroups } = {
      grouped: [],
    },
  } = useCategories();

  const categoryGroupSuggestions: CategoryGroupAutocompleteItem[] =
    useMemo(() => {
      const allSuggestions = categoryGroups || defaultCategoryGroups;

      if (!showHiddenCategories) {
        return allSuggestions.filter(suggestion => !suggestion.hidden);
      }

      return allSuggestions;
    }, [categoryGroups, defaultCategoryGroups, showHiddenCategories]);

  return (
    <Autocomplete
      strict
      highlightFirst
      embedded={embedded}
      closeOnBlur={closeOnBlur}
      suggestions={categoryGroupSuggestions}
      renderItems={(items, getItemProps, highlightedIndex) => (
        <CategoryGroupList
          items={items}
          embedded={embedded}
          getItemProps={getItemProps}
          highlightedIndex={highlightedIndex}
          renderCategoryGroupItem={renderCategoryGroupItem}
          showHiddenItems={showHiddenCategories}
        />
      )}
      {...props}
    />
  );
}

type CategoryGroupItemProps = {
  item: CategoryGroupAutocompleteItem;
  className?: string;
  style?: CSSProperties;
  highlighted?: boolean;
  embedded?: boolean;
  showBalances?: boolean;
};

function CategoryGroupItem({
  item,
  className,
  style,
  highlighted,
  embedded,
  ...props
}: CategoryGroupItemProps) {
  const { t } = useTranslation();
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
          ...narrowStyle,
        }),
      )}
      data-testid={`${item.name}-category-group-item`}
      data-highlighted={highlighted || undefined}
      {...props}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <TextOneLine>
          {item.name}
          {item.hidden ? ' ' + t('(hidden)') : ''}
        </TextOneLine>
      </View>
    </button>
  );
}

function defaultRenderCategoryItem(
  props: ComponentPropsWithoutRef<typeof CategoryGroupItem>,
): ReactElement<typeof CategoryGroupItem> {
  return <CategoryGroupItem {...props} />;
}
