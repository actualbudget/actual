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
} from '@desktop-client/queries/queriesSlice';
import { useDispatch } from '@desktop-client/redux';

export type PayeeAutocompleteItem = PayeeEntity;

const MAX_AUTO_SUGGESTIONS = 5;

function getPayeeSuggestions(
  commonPayees: PayeeAutocompleteItem[],
  payees: PayeeAutocompleteItem[],
): (PayeeAutocompleteItem & PayeeItemType)[] {
  const favoritePayees = payees
    .filter(p => p.favorite)
    .map(p => {
      return { ...p, itemType: determineItemType(p, true) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  let additionalCommonPayees: (PayeeAutocompleteItem & PayeeItemType)[] = [];
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
    const filteredPayees: (PayeeAutocompleteItem & PayeeItemType)[] = payees
      .filter(p => !favoritePayees.find(fp => fp.id === p.id))
      .filter(p => !additionalCommonPayees.find(fp => fp.id === p.id))
      .map<PayeeAutocompleteItem & PayeeItemType>(p => {
        return { ...p, itemType: determineItemType(p, false) };
      });

    return favoritePayees.concat(additionalCommonPayees).concat(filteredPayees);
  }

  return payees.map(p => {
    return { ...p, itemType: determineItemType(p, false) };
  });
}

function filterActivePayees(
  payees: PayeeAutocompleteItem[],
  focusTransferPayees: boolean,
  accounts: AccountEntity[],
) {
  let activePayees = accounts ? getActivePayees(payees, accounts) : payees;

  if (focusTransferPayees && activePayees) {
    activePayees = activePayees.filter(p => !!p.transfer_acct);
  }

  return activePayees || [];
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

function determineItemType(
  item: PayeeAutocompleteItem,
  isCommon: boolean,
): ItemTypes {
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

  let createNew = null;
  items = [...items];

  // If the "new payee" item exists, create it as a special-cased item
  // with the value of the input so it always shows whatever the user
  // entered
  if (items[0].id === 'new') {
    const [first, ...rest] = items;
    createNew = first;
    items = rest;
  }

  const offset = createNew ? 1 : 0;
  let lastType = null;

  return (
    <View>
      <View
        style={{
          overflow: 'auto',
          padding: '5px 0',
          ...(!embedded && { maxHeight: 175 }),
        }}
      >
        {createNew &&
          renderCreatePayeeButton({
            ...(getItemProps ? getItemProps({ item: createNew }) : null),
            payeeName: inputValue,
            highlighted: highlightedIndex === 0,
            embedded,
          })}

        {items.map((item, idx) => {
          const itemType = item.itemType;
          let title;

          if (itemType === 'common_payee' && lastType !== itemType) {
            title = t('Suggested Payees');
          } else if (itemType === 'payee' && lastType !== itemType) {
            title = t('Payees');
          } else if (itemType === 'account' && lastType !== itemType) {
            title = t('Transfer To/From');
          }
          const showMoreMessage =
            idx === items.length - 1 && items.length > 100;
          lastType = itemType;

          return (
            <Fragment key={item.id}>
              {title && (
                <Fragment key={`title-${idx}`}>
                  {renderPayeeItemGroupHeader({ title })}
                </Fragment>
              )}
              <Fragment key={item.id}>
                {renderPayeeItem({
                  ...(getItemProps ? getItemProps({ item }) : null),
                  item,
                  highlighted: highlightedIndex === idx + offset,
                  embedded,
                })}
              </Fragment>

              {showMoreMessage && (
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
            </Fragment>
          );
        })}
      </View>
      {footer}
    </View>
  );
}

export type PayeeAutocompleteProps = ComponentProps<
  typeof Autocomplete<PayeeAutocompleteItem>
> & {
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
  payees?: PayeeAutocompleteItem[];
};

export function PayeeAutocomplete({
  value,
  inputProps,
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
    const filteredSuggestions = filterActivePayees(
      suggestions,
      focusTransferPayees,
      accounts,
    );

    if (!hasPayeeInput) {
      return filteredSuggestions;
    }

    return [{ id: 'new', favorite: false, name: '' }, ...filteredSuggestions];
  }, [commonPayees, payees, focusTransferPayees, accounts, hasPayeeInput]);

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
        onFocus: () => setPayeeFieldFocused(true),
        onChangeValue: setRawPayee,
      }}
      onUpdate={(id, inputValue) => onUpdate?.(id, makeNew(id, inputValue))}
      onSelect={handleSelect}
      getHighlightedIndex={suggestions => {
        if (suggestions.length > 1 && suggestions[0].id === 'new') {
          return 1;
        }
        return 0;
      }}
      filterSuggestions={(suggestions, value) => {
        let filtered = suggestions.filter(suggestion => {
          if (suggestion.id === 'new') {
            return !value || value === '' || focusTransferPayees ? false : true;
          }

          return defaultFilterSuggestion(suggestion, value);
        });

        filtered.sort((p1, p2) => {
          const r1 = getNormalisedString(p1.name).startsWith(
            getNormalisedString(value),
          );
          const r2 = getNormalisedString(p2.name).startsWith(
            getNormalisedString(value),
          );
          const r1exact = p1.name.toLowerCase() === value.toLowerCase();
          const r2exact = p2.name.toLowerCase() === value.toLowerCase();

          // (maniacal laughter) mwahaHAHAHAHAH
          if (p1.id === 'new') {
            return -1;
          } else if (p2.id === 'new') {
            return 1;
          } else {
            if (r1exact && !r2exact) {
              return -1;
            } else if (!r1exact && r2exact) {
              return 1;
            } else {
              if (r1 === r2) {
                return 0;
              } else if (r1 && !r2) {
                return -1;
              } else {
                return 1;
              }
            }
          }
        });

        filtered = filtered.slice(0, 100);

        if (filtered.length >= 2 && filtered[0].id === 'new') {
          if (
            filtered[1].name.toLowerCase() === value.toLowerCase() &&
            !filtered[1].transfer_acct
          ) {
            return filtered.slice(1);
          }
        }
        return filtered;
      }}
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
