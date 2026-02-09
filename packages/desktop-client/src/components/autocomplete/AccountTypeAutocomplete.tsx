import { Fragment, useMemo, useState } from 'react';
import type {
  ComponentProps,
  ComponentPropsWithoutRef,
  ReactElement,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { TextOneLine } from '@actual-app/components/text-one-line';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

import { ACCOUNT_TYPES } from 'loot-core/shared/accounts';
import { getNormalisedString } from 'loot-core/shared/normalisation';

import { Autocomplete, defaultFilterSuggestion } from './Autocomplete';
import type { AutocompleteItem } from './Autocomplete';
import { ItemHeader } from './ItemHeader';

import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';

type AccountTypeItem = AutocompleteItem & {
  id: string;
  name: string;
  group: 'used' | 'other';
};

const NEW_ITEM_ID = 'new';
const NEW_ITEM_PREFIX = `${NEW_ITEM_ID}:`;

function makeNew(id: string, rawValue: string): string {
  if (id === NEW_ITEM_ID && !rawValue.startsWith(NEW_ITEM_PREFIX)) {
    return NEW_ITEM_PREFIX + rawValue;
  }
  return id;
}

function stripNew(value: string | null | undefined): string | null {
  if (typeof value === 'string' && value.startsWith(NEW_ITEM_PREFIX)) {
    return NEW_ITEM_ID;
  }
  return value ?? null;
}

type AccountTypeItemWithIndex = AccountTypeItem & { highlightedIndex: number };

type AccountTypeListProps = {
  items: AccountTypeItem[];
  getItemProps: (arg: { item: AccountTypeItem }) => ComponentProps<typeof View>;
  highlightedIndex: number;
  embedded?: boolean;
  inputValue: string;
  renderCreateButton?: (
    props: ComponentPropsWithoutRef<typeof CreateAccountTypeButton>,
  ) => ReactElement<typeof CreateAccountTypeButton>;
  renderItemGroupHeader?: (
    props: ComponentPropsWithoutRef<typeof ItemHeader>,
  ) => ReactElement<typeof ItemHeader>;
  renderItem?: (
    props: ComponentPropsWithoutRef<typeof AccountTypeItemComponent>,
  ) => ReactElement<typeof AccountTypeItemComponent>;
};

function AccountTypeList({
  items,
  getItemProps,
  highlightedIndex,
  embedded,
  inputValue,
  renderCreateButton = defaultRenderCreateButton,
  renderItemGroupHeader = defaultRenderItemGroupHeader,
  renderItem = defaultRenderItem,
}: AccountTypeListProps) {
  const { t } = useTranslation();

  const { newItem, usedTypes, otherTypes } = useMemo(() => {
    let currentIndex = 0;
    let newItem: AccountTypeItemWithIndex | null = null;
    const usedTypes: AccountTypeItemWithIndex[] = [];
    const otherTypes: AccountTypeItemWithIndex[] = [];

    for (const item of items) {
      const indexedItem = { ...item, highlightedIndex: currentIndex++ };

      if (item.id === NEW_ITEM_ID) {
        newItem = indexedItem;
      } else if (item.group === 'used') {
        usedTypes.push(indexedItem);
      } else {
        otherTypes.push(indexedItem);
      }
    }

    return {
      newItem,
      usedTypes,
      otherTypes,
    };
  }, [items]);

  function renderAccountTypeItem(item: AccountTypeItemWithIndex) {
    const { type: _type, ...itemProps } = getItemProps({ item });
    return renderItem({
      ...itemProps,
      item,
      highlighted: highlightedIndex === item.highlightedIndex,
      embedded,
    });
  }

  return (
    <View>
      <View
        style={{
          overflow: 'auto',
          padding: '5px 0',
          ...(!embedded && { maxHeight: 175 }),
        }}
      >
        {newItem &&
          renderCreateButton({
            ...getItemProps({ item: newItem }),
            typeName: inputValue,
            highlighted: newItem.highlightedIndex === highlightedIndex,
            embedded,
          })}

        {usedTypes.length > 0 &&
          renderItemGroupHeader({ title: t('Used Types') })}
        {usedTypes.map(item => (
          <Fragment key={item.id}>{renderAccountTypeItem(item)}</Fragment>
        ))}

        {otherTypes.length > 0 &&
          renderItemGroupHeader({ title: t('Other Types') })}
        {otherTypes.map(item => (
          <Fragment key={item.id}>{renderAccountTypeItem(item)}</Fragment>
        ))}
      </View>
    </View>
  );
}

function customSort(obj: AccountTypeItem, value: string): number {
  const name = getNormalisedString(obj.name);
  if (obj.id === NEW_ITEM_ID) {
    return -3;
  }
  if (obj.group === 'used' && name.includes(value)) {
    return -2;
  }
  if (name.includes(value)) {
    return -1;
  }
  return 1;
}

export type AccountTypeAutocompleteProps = {
  value?: string | null;
  inputProps?: ComponentProps<
    typeof Autocomplete<AccountTypeItem>
  >['inputProps'];
  embedded?: boolean;
  closeOnBlur?: boolean;
  onUpdate?: (id: string, value: string) => void;
  onSelect?: (id: string, value: string) => void;
  renderCreateButton?: (
    props: ComponentPropsWithoutRef<typeof CreateAccountTypeButton>,
  ) => ReactElement<typeof CreateAccountTypeButton>;
  renderItemGroupHeader?: (
    props: ComponentPropsWithoutRef<typeof ItemHeader>,
  ) => ReactElement<typeof ItemHeader>;
  renderItem?: (
    props: ComponentPropsWithoutRef<typeof AccountTypeItemComponent>,
  ) => ReactElement<typeof AccountTypeItemComponent>;
};

export function AccountTypeAutocomplete({
  value,
  inputProps,
  embedded,
  closeOnBlur,
  onUpdate,
  onSelect,
  renderCreateButton = defaultRenderCreateButton,
  renderItemGroupHeader = defaultRenderItemGroupHeader,
  renderItem = defaultRenderItem,
}: AccountTypeAutocompleteProps) {
  const { t } = useTranslation();
  const accounts = useAccounts();
  const [savedTypeOrder = []] = useLocalPref('sidebar.typeOrder');

  const [rawInput, setRawInput] = useState('');
  const hasInput = !!rawInput;

  // Derive used types from existing accounts
  const { usedOnBudgetTypes, usedOffBudgetTypes } = useMemo(() => {
    const onBudget = new Set<string>();
    const offBudget = new Set<string>();
    for (const account of accounts) {
      if (!account.type) {
        continue;
      }
      if (account.offbudget) {
        offBudget.add(account.type);
      } else {
        onBudget.add(account.type);
      }
    }
    return { usedOnBudgetTypes: onBudget, usedOffBudgetTypes: offBudget };
  }, [accounts]);

  const usedTypeNames = useMemo(() => {
    const types = new Set<string>();
    for (const name of usedOnBudgetTypes) {
      types.add(name);
    }
    for (const name of usedOffBudgetTypes) {
      types.add(name);
    }
    return types;
  }, [usedOnBudgetTypes, usedOffBudgetTypes]);

  const suggestions: AccountTypeItem[] = useMemo(() => {
    const orderedOnBudget: string[] = [];
    const orderedOffBudget: string[] = [];

    for (const key of savedTypeOrder) {
      const splitIndex = key.indexOf('-type-');
      if (splitIndex === -1) {
        continue;
      }
      const prefix = key.slice(0, splitIndex);
      const typeName = key.slice(splitIndex + '-type-'.length);
      if (prefix === 'onbudget' && usedOnBudgetTypes.has(typeName)) {
        if (!orderedOnBudget.includes(typeName)) {
          orderedOnBudget.push(typeName);
        }
      }
      if (prefix === 'offbudget' && usedOffBudgetTypes.has(typeName)) {
        if (!orderedOffBudget.includes(typeName)) {
          orderedOffBudget.push(typeName);
        }
      }
    }

    const remainingOnBudget = [...usedOnBudgetTypes]
      .filter(name => !orderedOnBudget.includes(name))
      .sort((a, b) => a.localeCompare(b));
    const remainingOffBudget = [...usedOffBudgetTypes]
      .filter(name => !orderedOffBudget.includes(name))
      .sort((a, b) => a.localeCompare(b));

    const seenNames = new Set<string>();
    const usedItems: AccountTypeItem[] = [];
    for (const name of [
      ...orderedOnBudget,
      ...remainingOnBudget,
      ...orderedOffBudget,
      ...remainingOffBudget,
    ]) {
      if (seenNames.has(name)) {
        continue;
      }
      seenNames.add(name);
      usedItems.push({
        id: name,
        name,
        group: 'used' as const,
      });
    }

    const otherItems: AccountTypeItem[] = ACCOUNT_TYPES.filter(
      name => !usedTypeNames.has(name),
    ).map(name => ({
      id: name,
      name,
      group: 'other' as const,
    }));

    const allItems = [...usedItems, ...otherItems];

    if (!hasInput) {
      return allItems;
    }

    return [
      {
        id: 'new',
        name: '',
        group: 'other' as const,
      } satisfies AccountTypeItem,
      ...allItems,
    ];
  }, [
    savedTypeOrder,
    usedOnBudgetTypes,
    usedOffBudgetTypes,
    usedTypeNames,
    hasInput,
  ]);

  function handleSelect(id: string, rawInputValue: string) {
    if (id === NEW_ITEM_ID) {
      onSelect?.(rawInputValue, rawInputValue);
    } else {
      onSelect?.(id, rawInputValue);
    }
  }

  const filterSuggestions = (
    allSuggestions: AccountTypeItem[],
    filterValue: string,
  ) => {
    const normalizedValue = getNormalisedString(filterValue);
    const filtered = allSuggestions
      .filter(suggestion => {
        if (suggestion.id === NEW_ITEM_ID) {
          return filterValue !== '';
        }
        return defaultFilterSuggestion(suggestion, filterValue);
      })
      .sort(
        (a, b) =>
          customSort(a, normalizedValue) - customSort(b, normalizedValue),
      );

    // If exact match found anywhere in results, remove the "Create type" option
    const hasExactMatch = filtered.some(
      suggestion =>
        suggestion.id !== NEW_ITEM_ID &&
        getNormalisedString(suggestion.name) === normalizedValue,
    );
    if (hasExactMatch) {
      return filtered.filter(suggestion => suggestion.id !== NEW_ITEM_ID);
    }
    return filtered;
  };

  return (
    <Autocomplete
      strict
      embedded={embedded}
      value={stripNew(value)}
      suggestions={suggestions}
      closeOnBlur={closeOnBlur}
      itemToString={item => {
        if (!item) {
          return '';
        }
        if (item.id === NEW_ITEM_ID) {
          return rawInput;
        }
        return item.name;
      }}
      inputProps={{
        ...inputProps,
        autoCapitalize: 'words',
        onBlur: () => {
          setRawInput('');
        },
        'aria-label': t('Account Type'),
        onChangeValue: setRawInput,
      }}
      onUpdate={(id, inputValue) => onUpdate?.(id, makeNew(id, inputValue))}
      onSelect={handleSelect}
      getHighlightedIndex={filteredSuggestions => {
        if (filteredSuggestions.length === 0) {
          return null;
        }
        if (filteredSuggestions[0].id === NEW_ITEM_ID) {
          return filteredSuggestions.length > 1 ? 1 : 0;
        }
        return 0;
      }}
      filterSuggestions={filterSuggestions}
      renderItems={(items, getItemProps, idx, inputValue) => (
        <AccountTypeList
          items={items}
          getItemProps={getItemProps}
          highlightedIndex={idx}
          inputValue={inputValue ?? ''}
          embedded={embedded}
          renderCreateButton={renderCreateButton}
          renderItemGroupHeader={renderItemGroupHeader}
          renderItem={renderItem}
        />
      )}
    />
  );
}

// --- Create button ---

type CreateAccountTypeButtonProps = ComponentPropsWithoutRef<typeof View> & {
  typeName: string;
  highlighted?: boolean;
  embedded?: boolean;
};

export function CreateAccountTypeButton({
  typeName,
  highlighted,
  embedded,
  style,
  ...props
}: CreateAccountTypeButtonProps) {
  const { isNarrowWidth } = useResponsive();
  const narrowStyle = isNarrowWidth ? { ...styles.mobileMenuItem } : {};
  const iconSize = isNarrowWidth ? 14 : 8;

  return (
    <View
      data-testid="create-account-type-button"
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
          backgroundColor: theme.menuAutoCompleteBackgroundHover,
        },
        ...narrowStyle,
        ...style,
      }}
      {...props}
    >
      <SvgAdd
        width={iconSize}
        height={iconSize}
        style={{ marginRight: 5, display: 'inline-block' }}
      />
      <Trans>Create type "{{ typeName }}"</Trans>
    </View>
  );
}

function defaultRenderCreateButton(
  props: ComponentPropsWithoutRef<typeof CreateAccountTypeButton>,
): ReactElement<typeof CreateAccountTypeButton> {
  return <CreateAccountTypeButton {...props} />;
}

function defaultRenderItemGroupHeader(
  props: ComponentPropsWithoutRef<typeof ItemHeader>,
): ReactElement<typeof ItemHeader> {
  return <ItemHeader {...props} type="account-type" />;
}

// --- Account type item ---

type AccountTypeItemComponentProps = ComponentPropsWithoutRef<typeof View> & {
  item: AccountTypeItem;
  highlighted?: boolean;
  embedded?: boolean;
};

function AccountTypeItemComponent({
  item,
  className,
  highlighted,
  embedded,
  ...props
}: AccountTypeItemComponentProps) {
  const { isNarrowWidth } = useResponsive();
  const narrowStyle = isNarrowWidth
    ? {
        ...styles.mobileMenuItem,
        borderRadius: 0,
        borderTop: `1px solid ${theme.pillBorder}`,
      }
    : {};

  return (
    <View
      className={cx(
        className,
        css({
          backgroundColor: highlighted
            ? theme.menuAutoCompleteBackgroundHover
            : 'transparent',
          color: highlighted
            ? theme.menuAutoCompleteItemTextHover
            : theme.menuAutoCompleteItemText,
          borderRadius: embedded ? 4 : 0,
          padding: 4,
          paddingLeft: 20,
          border: 'none',
          font: 'inherit',
          textAlign: 'left',
          ...narrowStyle,
        }),
      )}
      data-testid={`${item.name}-account-type-item`}
      data-highlighted={highlighted || undefined}
      {...props}
    >
      <TextOneLine>{item.name}</TextOneLine>
    </View>
  );
}

function defaultRenderItem(
  props: ComponentPropsWithoutRef<typeof AccountTypeItemComponent>,
): ReactElement<typeof AccountTypeItemComponent> {
  return <AccountTypeItemComponent {...props} />;
}
