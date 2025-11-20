// @ts-strict-ignore
import React, {
  Fragment,
  useState,
  useMemo,
  type ComponentProps,
  type ReactNode,
  type ComponentType,
  type SVGProps,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type CSSProperties,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgAdd, SvgBookmark } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { TextOneLine } from '@actual-app/components/text-one-line';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

import { getNormalisedString } from 'loot-core/shared/normalisation';
import { type AccountEntity, type PayeeEntity } from 'loot-core/types/models';

import {
  Autocomplete,
  defaultFilterSuggestion,
  AutocompleteFooter,
} from './Autocomplete';
import { ItemHeader } from './ItemHeader';

import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useCommonPayees, usePayees } from '@desktop-client/hooks/usePayees';
import {
  createPayee,
  getActivePayees,
} from '@desktop-client/payees/payeesSlice';
import { useDispatch } from '@desktop-client/redux';

type PayeeAutocompleteItem = PayeeEntity & PayeeItemType;

const MAX_AUTO_SUGGESTIONS = 5;

function getPayeeSuggestions(
  commonPayees: PayeeEntity[],
  payees: PayeeEntity[],
): PayeeAutocompleteItem[] {
  const favoritePayees: PayeeAutocompleteItem[] = payees
    .filter(p => p.favorite)
    .map(p => {
      return { ...p, itemType: determineItemType(p, true) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  let additionalCommonPayees: PayeeAutocompleteItem[] = [];
  if (commonPayees?.length > 0) {
    if (favoritePayees.length < MAX_AUTO_SUGGESTIONS) {
      additionalCommonPayees = commonPayees
        .filter(
          p => !(p.favorite || favoritePayees.map(fp => fp.id).includes(p.id)),
        )
        .slice(0, MAX_AUTO_SUGGESTIONS - favoritePayees.length)
        .map(p => {
          return { ...p, itemType: determineItemType(p, true) };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  if (favoritePayees.length + additionalCommonPayees.length) {
    const filteredPayees: PayeeAutocompleteItem[] = payees
      .filter(p => !favoritePayees.find(fp => fp.id === p.id))
      .filter(p => !additionalCommonPayees.find(fp => fp.id === p.id))
      .map<PayeeAutocompleteItem>(p => {
        return { ...p, itemType: determineItemType(p, false) };
      });

    return favoritePayees.concat(additionalCommonPayees).concat(filteredPayees);
  }

  return payees.map(p => {
    return { ...p, itemType: determineItemType(p, false) };
  });
}

function filterActivePayees<T extends PayeeEntity>(
  payees: T[],
  accounts: AccountEntity[],
): T[] {
  return accounts ? (getActivePayees(payees, accounts) as T[]) : payees;
}

function filterTransferPayees<T extends PayeeEntity>(payees: T[]): T[] {
  return payees.filter(payee => !!payee.transfer_acct);
}

function makeNew(id, rawPayee) {
  if (id === 'new' && !rawPayee.startsWith('new:')) {
    return 'new:' + rawPayee;
  }
  return id;
}

// Convert the fully resolved new value into the 'new' id that can be
// looked up in the suggestions
function stripNew(value) {
  if (typeof value === 'string' && value.startsWith('new:')) {
    return 'new';
  }
  return value;
}

type PayeeListProps = {
  items: (PayeeAutocompleteItem & PayeeItemType)[];
  commonPayees: PayeeEntity[];
  getItemProps: (arg: {
    item: PayeeAutocompleteItem;
  }) => ComponentProps<typeof View>;
  highlightedIndex: number;
  embedded: boolean;
  inputValue: string;
  renderCreatePayeeButton?: (
    props: ComponentPropsWithoutRef<typeof CreatePayeeButton>,
  ) => ReactNode;
  renderPayeeItemGroupHeader?: (
    props: ComponentPropsWithoutRef<typeof ItemHeader>,
  ) => ReactNode;
  renderPayeeItem?: (
    props: ComponentPropsWithoutRef<typeof PayeeItem>,
  ) => ReactNode;
  footer: ReactNode;
};

type ItemTypes = 'account' | 'payee' | 'common_payee';
type PayeeItemType = {
  itemType: ItemTypes;
};

function determineItemType(item: PayeeEntity, isCommon: boolean): ItemTypes {
  if (item.transfer_acct) {
    return 'account';
  }
  if (isCommon) {
    return 'common_payee';
  } else {
    return 'payee';
  }
}

function PayeeList({
  items,
  getItemProps,
  highlightedIndex,
  embedded,
  inputValue,
  renderCreatePayeeButton = defaultRenderCreatePayeeButton,
  renderPayeeItemGroupHeader = defaultRenderPayeeItemGroupHeader,
  renderPayeeItem = defaultRenderPayeeItem,
  footer,
}: PayeeListProps) {
  const { t } = useTranslation();

  // If the "new payee" item exists, create it as a special-cased item
  // with the value of the input so it always shows whatever the user
  // entered

  const { newPayee, suggestedPayees, payees, transferPayees } = useMemo(() => {
    let currentIndex = 0;
    const result = items.reduce(
      (acc, item) => {
        if (item.id === 'new') {
          acc.newPayee = { ...item };
        } else if (item.itemType === 'common_payee') {
          acc.suggestedPayees.push({ ...item });
        } else if (item.itemType === 'payee') {
          acc.payees.push({ ...item });
        } else if (item.itemType === 'account') {
          acc.transferPayees.push({ ...item });
        }
        return acc;
      },
      {
        newPayee: null as PayeeAutocompleteItem | null,
        suggestedPayees: [] as Array<PayeeAutocompleteItem>,
        payees: [] as Array<PayeeAutocompleteItem>,
        transferPayees: [] as Array<PayeeAutocompleteItem>,
      },
    );

    // assign indexes in render order
    const newPayeeWithIndex = result.newPayee
      ? { ...result.newPayee, highlightedIndex: currentIndex++ }
      : null;

    const suggestedPayeesWithIndex = result.suggestedPayees.map(item => ({
      ...item,
      highlightedIndex: currentIndex++,
    }));

    const payeesWithIndex = result.payees.map(item => ({
      ...item,
      highlightedIndex: currentIndex++,
    }));

    const transferPayeesWithIndex = result.transferPayees.map(item => ({
      ...item,
      highlightedIndex: currentIndex++,
    }));

    return {
      newPayee: newPayeeWithIndex,
      suggestedPayees: suggestedPayeesWithIndex,
      payees: payeesWithIndex,
      transferPayees: transferPayeesWithIndex,
    };
  }, [items]);

  // We limit the number of payees shown to 100.
  // So we show a hint that more are available via search.
  const showSearchForMore = items.length >= 100;

  return (
    <View>
      <View
        style={{
          overflow: 'auto',
          padding: '5px 0',
          ...(!embedded && { maxHeight: 175 }),
        }}
      >
        {newPayee &&
          renderCreatePayeeButton({
            ...(getItemProps ? getItemProps({ item: newPayee }) : {}),
            payeeName: inputValue,
            highlighted: newPayee.highlightedIndex === highlightedIndex,
            embedded,
          })}

        {suggestedPayees.length > 0 &&
          renderPayeeItemGroupHeader({ title: t('Suggested Payees') })}
        {suggestedPayees.map(item => (
          <Fragment key={item.id}>
            {renderPayeeItem({
              ...(getItemProps ? getItemProps({ item }) : {}),
              item,
              highlighted: highlightedIndex === item.highlightedIndex,
              embedded,
            })}
          </Fragment>
        ))}

        {payees.length > 0 &&
          renderPayeeItemGroupHeader({ title: t('Payees') })}
        {payees.map(item => (
          <Fragment key={item.id}>
            {renderPayeeItem({
              ...(getItemProps ? getItemProps({ item }) : {}),
              item,
              highlighted: highlightedIndex === item.highlightedIndex,
              embedded,
            })}
          </Fragment>
        ))}

        {transferPayees.length > 0 &&
          renderPayeeItemGroupHeader({ title: t('Transfer To/From') })}
        {transferPayees.map(item => (
          <Fragment key={item.id}>
            {renderPayeeItem({
              ...(getItemProps ? getItemProps({ item }) : {}),
              item,
              highlighted: highlightedIndex === item.highlightedIndex,
              embedded,
            })}
          </Fragment>
        ))}

        {showSearchForMore && (
          <div
            style={{
              fontSize: 11,
              padding: 5,
              color: theme.pageTextLight,
              textAlign: 'center',
            }}
          >
            <Trans>More payees are available, search to find them</Trans>
          </div>
        )}
      </View>
      {footer}
    </View>
  );
}

function customSort(obj: PayeeAutocompleteItem, value: string): number {
  const name = getNormalisedString(obj.name);
  if (obj.id === 'new') {
    return -2;
  }
  if (name.includes(value)) {
    return -1;
  }
  return 1;
}

export type PayeeAutocompleteProps = ComponentProps<
  typeof Autocomplete<PayeeAutocompleteItem>
> & {
  showInactivePayees?: boolean;
  showMakeTransfer?: boolean;
  showManagePayees?: boolean;
  embedded?: boolean;
  onManagePayees?: () => void;
  renderCreatePayeeButton?: (
    props: ComponentPropsWithoutRef<typeof CreatePayeeButton>,
  ) => ReactElement<typeof CreatePayeeButton>;
  renderPayeeItemGroupHeader?: (
    props: ComponentPropsWithoutRef<typeof ItemHeader>,
  ) => ReactElement<typeof ItemHeader>;
  renderPayeeItem?: (
    props: ComponentPropsWithoutRef<typeof PayeeItem>,
  ) => ReactElement<typeof PayeeItem>;
  accounts?: AccountEntity[];
  payees?: PayeeEntity[];
};

export function PayeeAutocomplete({
  value,
  inputProps,
  showInactivePayees = false,
  showMakeTransfer = true,
  showManagePayees = false,
  clearOnBlur = true,
  closeOnBlur,
  embedded,
  onUpdate,
  onSelect,
  onManagePayees,
  renderCreatePayeeButton = defaultRenderCreatePayeeButton,
  renderPayeeItemGroupHeader = defaultRenderPayeeItemGroupHeader,
  renderPayeeItem = defaultRenderPayeeItem,
  accounts,
  payees,
  ...props
}: PayeeAutocompleteProps) {
  const { t } = useTranslation();

  const commonPayees = useCommonPayees();
  const retrievedPayees = usePayees();
  if (!payees) {
    payees = retrievedPayees;
  }

  const cachedAccounts = useAccounts();
  if (!accounts) {
    accounts = cachedAccounts;
  }

  const [focusTransferPayees, setFocusTransferPayees] = useState(false);
  const [rawPayee, setRawPayee] = useState('');
  const hasPayeeInput = !!rawPayee;
  const payeeSuggestions: PayeeAutocompleteItem[] = useMemo(() => {
    const suggestions = getPayeeSuggestions(commonPayees, payees);

    let filteredSuggestions: PayeeAutocompleteItem[] = [...suggestions];

    if (!showInactivePayees) {
      filteredSuggestions = filterActivePayees(filteredSuggestions, accounts);
    }

    if (focusTransferPayees) {
      filteredSuggestions = filterTransferPayees(filteredSuggestions);
    }

    if (!hasPayeeInput) {
      return filteredSuggestions;
    }

    return [
      { id: 'new', favorite: false, name: '' } as PayeeAutocompleteItem,
      ...filteredSuggestions,
    ];
  }, [
    commonPayees,
    payees,
    focusTransferPayees,
    accounts,
    hasPayeeInput,
    showInactivePayees,
  ]);

  const dispatch = useDispatch();

  async function handleSelect(idOrIds, rawInputValue) {
    if (!clearOnBlur) {
      onSelect?.(makeNew(idOrIds, rawInputValue), rawInputValue);
    } else {
      const create = payeeName =>
        dispatch(createPayee({ name: payeeName })).unwrap();

      if (Array.isArray(idOrIds)) {
        idOrIds = await Promise.all(
          idOrIds.map(v => (v === 'new' ? create(rawInputValue) : v)),
        );
      } else {
        if (idOrIds === 'new') {
          idOrIds = await create(rawInputValue);
        }
      }
      onSelect?.(idOrIds, rawInputValue);
    }
  }

  const [payeeFieldFocused, setPayeeFieldFocused] = useState(false);

  const filterSuggestions = (
    suggestions: PayeeAutocompleteItem[],
    value: string,
  ) => {
    const normalizedValue = getNormalisedString(value);
    const filtered = suggestions
      .filter(suggestion => {
        if (suggestion.id === 'new') {
          return !value || value === '' || focusTransferPayees ? false : true;
        }

        return defaultFilterSuggestion(suggestion, value);
      })
      .sort(
        (a, b) =>
          customSort(a, normalizedValue) - customSort(b, normalizedValue),
      )
      // Only show the first 100 results, users can search to find more.
      // If user want to view all payees, it can be done via the manage payees page.
      .slice(0, 100);

    if (filtered.length >= 2 && filtered[0].id === 'new') {
      const firstFiltered = filtered[1];
      if (
        getNormalisedString(firstFiltered.name) === normalizedValue &&
        !firstFiltered.transfer_acct
      ) {
        // Exact match found, remove the 'Create payee` option.
        return filtered.slice(1);
      }
    }
    return filtered;
  };

  return (
    <Autocomplete
      key={focusTransferPayees ? 'transfers' : 'all'}
      strict={true}
      embedded={embedded}
      value={stripNew(value)}
      suggestions={payeeSuggestions}
      clearOnBlur={clearOnBlur}
      closeOnBlur={closeOnBlur}
      itemToString={item => {
        if (!item) {
          return '';
        } else if (item.id === 'new') {
          return rawPayee;
        }
        return item.name;
      }}
      focused={payeeFieldFocused}
      inputProps={{
        ...inputProps,
        autoCapitalize: 'words',
        onBlur: () => {
          setRawPayee('');
          setPayeeFieldFocused(false);
        },
        'aria-label': t('Payee'),
        onFocus: () => setPayeeFieldFocused(true),
        onChangeValue: setRawPayee,
      }}
      onUpdate={(id, inputValue) => onUpdate?.(id, makeNew(id, inputValue))}
      onSelect={handleSelect}
      getHighlightedIndex={suggestions => {
        if (suggestions.length === 0) {
          return null;
        } else if (suggestions[0].id === 'new') {
          // Highlight the first payee since the create payee option is at index 0.
          return suggestions.length > 1 ? 1 : 0;
        }
        return 0;
      }}
      filterSuggestions={filterSuggestions}
      renderItems={(items, getItemProps, highlightedIndex, inputValue) => (
        <PayeeList
          items={items}
          commonPayees={commonPayees}
          getItemProps={getItemProps}
          highlightedIndex={highlightedIndex}
          inputValue={inputValue}
          embedded={embedded}
          renderCreatePayeeButton={renderCreatePayeeButton}
          renderPayeeItemGroupHeader={renderPayeeItemGroupHeader}
          renderPayeeItem={renderPayeeItem}
          footer={
            <AutocompleteFooter embedded={embedded}>
              {showMakeTransfer && (
                <Button
                  variant={focusTransferPayees ? 'menuSelected' : 'menu'}
                  style={showManagePayees && { marginBottom: 5 }}
                  onPress={() => {
                    onUpdate?.(null, null);
                    setFocusTransferPayees(!focusTransferPayees);
                  }}
                >
                  <Trans>Make transfer</Trans>
                </Button>
              )}
              {showManagePayees && (
                <Button variant="menu" onPress={() => onManagePayees()}>
                  <Trans>Manage payees</Trans>
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

type CreatePayeeButtonProps = {
  Icon?: ComponentType<SVGProps<SVGElement>>;
  payeeName: string;
  highlighted?: boolean;
  embedded?: boolean;
  style?: CSSProperties;
};

export function CreatePayeeButton({
  Icon,
  payeeName,
  highlighted,
  embedded,
  style,
  ...props
}: CreatePayeeButtonProps) {
  const { isNarrowWidth } = useResponsive();
  const narrowStyle = isNarrowWidth
    ? {
        ...styles.mobileMenuItem,
      }
    : {};
  const iconSize = isNarrowWidth ? 14 : 8;

  return (
    <View
      data-testid="create-payee-button"
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
      <Trans>Create payee “{{ payeeName }}”</Trans>
    </View>
  );
}

function defaultRenderCreatePayeeButton(
  props: ComponentPropsWithoutRef<typeof CreatePayeeButton>,
): ReactElement<typeof CreatePayeeButton> {
  return <CreatePayeeButton {...props} />;
}

function defaultRenderPayeeItemGroupHeader(
  props: ComponentPropsWithoutRef<typeof ItemHeader>,
): ReactElement<typeof ItemHeader> {
  return <ItemHeader {...props} type="payee" />;
}

type PayeeItemProps = {
  item: PayeeAutocompleteItem;
  className?: string;
  style?: CSSProperties;
  highlighted?: boolean;
  embedded?: boolean;
};

function PayeeItem({
  item,
  className,
  highlighted,
  embedded,
  ...props
}: PayeeItemProps) {
  const { isNarrowWidth } = useResponsive();
  const narrowStyle = isNarrowWidth
    ? {
        ...styles.mobileMenuItem,
        borderRadius: 0,
        borderTop: `1px solid ${theme.pillBorder}`,
      }
    : {};
  const iconSize = isNarrowWidth ? 14 : 8;
  let paddingLeftOverFromIcon = 20;
  let itemIcon = undefined;
  if (item.favorite) {
    itemIcon = (
      <SvgBookmark
        width={iconSize}
        height={iconSize}
        style={{ marginRight: 5, display: 'inline-block' }}
      />
    );
    paddingLeftOverFromIcon -= iconSize + 5;
  }
  return (
    <div
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
          paddingLeft: paddingLeftOverFromIcon,
          ...narrowStyle,
        }),
      )}
      data-testid={`${item.name}-payee-item`}
      data-highlighted={highlighted || undefined}
      {...props}
    >
      <TextOneLine>
        {itemIcon}
        {item.name}
      </TextOneLine>
    </div>
  );
}

function defaultRenderPayeeItem(
  props: ComponentPropsWithoutRef<typeof PayeeItem>,
): ReactElement<typeof PayeeItem> {
  return <PayeeItem {...props} />;
}
