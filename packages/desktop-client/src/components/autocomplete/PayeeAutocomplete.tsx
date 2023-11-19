import React, {
  Fragment,
  useState,
  useMemo,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  type ComponentType,
  type SVGProps,
} from 'react';
import { useDispatch } from 'react-redux';

import { css } from 'glamor';

import { createPayee } from 'loot-core/src/client/actions/queries';
import { useCachedAccounts } from 'loot-core/src/client/data-hooks/accounts';
import { useCachedPayees } from 'loot-core/src/client/data-hooks/payees';
import { getActivePayees } from 'loot-core/src/client/reducers/queries';
import {
  type AccountEntity,
  type PayeeEntity,
} from 'loot-core/src/types/models';

import Add from '../../icons/v1/Add';
import { useResponsive } from '../../ResponsiveProvider';
import { theme } from '../../style';
import Button from '../common/Button';
import View from '../common/View';

import Autocomplete, {
  defaultFilterSuggestion,
  AutocompleteFooter,
} from './Autocomplete';

function getPayeeSuggestions(payees, focusTransferPayees, accounts) {
  let activePayees = accounts ? getActivePayees(payees, accounts) : payees;

  if (focusTransferPayees && activePayees) {
    activePayees = activePayees.filter(p => !!p.transfer_acct);
  }

  return activePayees || [];
}

function makeNew(value, rawPayee) {
  if (value === 'new' && !rawPayee.startsWith('new:')) {
    return 'new:' + rawPayee;
  }
  return value;
}

// Convert the fully resolved new value into the 'new' id that can be
// looked up in the suggestions
function stripNew(value) {
  if (typeof value === 'string' && value.startsWith('new:')) {
    return 'new';
  }
  return value;
}

function PayeeList({
  items,
  getItemProps,
  highlightedIndex,
  embedded,
  inputValue,
  renderCreatePayeeButton = defaultRenderCreatePayeeButton,
  renderGroupHeader = defaultRenderGroupHeader,
  renderPayeeItem = defaultRenderPayeeItem,
  footer,
}) {
  const { isNarrowWidth } = useResponsive();
  let isFiltered = items.filtered;
  let createNew = null;
  items = [...items];

  // If the "new payee" item exists, create it as a special-cased item
  // with the value of the input so it always shows whatever the user
  // entered
  if (items[0].id === 'new') {
    let [first, ...rest] = items;
    createNew = first;
    items = rest;
  }

  let offset = createNew ? 1 : 0;
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
        {createNew && (
          <View
            {...(getItemProps ? getItemProps({ item: createNew }) : null)}
            style={{
              flexShrink: 0,
              padding: '6px 9px',
              backgroundColor:
                highlightedIndex === 0
                  ? theme.menuAutoCompleteBackgroundHover
                  : 'transparent',
              borderRadius: embedded ? 4 : 0,
              ':active': {
                backgroundColor: 'rgba(100, 100, 100, .25)',
              },
            }}
          >
            {renderCreatePayeeButton({ payeeName: inputValue })}
          </View>
        )}

        {items.map((item, idx) => {
          let type = item.transfer_acct ? 'account' : 'payee';
          let title;
          if (type === 'payee' && lastType !== type) {
            title = 'Payees';
          } else if (type === 'account' && lastType !== type) {
            title = 'Transfer To/From';
          }
          let showMoreMessage = idx === items.length - 1 && isFiltered;
          lastType = type;

          return (
            <Fragment key={item.id}>
              {title && (
                <Fragment key={`title-${idx}`}>
                  {renderGroupHeader({ title })}
                </Fragment>
              )}
              <Fragment key={item.id}>
                {renderPayeeItem({
                  ...(getItemProps ? getItemProps({ item }) : null),
                  item: item,
                  highlighted: highlightedIndex === idx + offset,
                  embedded: embedded,
                })}
              </Fragment>

              {showMoreMessage && (
                <div
                  style={{
                    fontSize: isNarrowWidth ? 'inherit' : 11,
                    padding: 5,
                    color: theme.pageTextLight,
                    textAlign: 'center',
                  }}
                >
                  More payees are available, search to find them
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

type PayeeAutocompleteProps = {
  value: ComponentProps<typeof Autocomplete>['value'];
  inputProps: ComponentProps<typeof Autocomplete>['inputProps'];
  showMakeTransfer?: boolean;
  showManagePayees?: boolean;
  tableBehavior: ComponentProps<typeof Autocomplete>['tableBehavior'];
  embedded?: boolean;
  closeOnBlur: ComponentProps<typeof Autocomplete>['closeOnBlur'];
  onUpdate?: (value: string) => void;
  onSelect?: (value: string) => void;
  onManagePayees: () => void;
  renderCreatePayeeButton?: (props: CreatePayeeButtonProps) => ReactNode;
  renderGroupHeader?: (props: PayeeGroupHeaderProps) => ReactNode;
  renderPayeeItem?: (props: PayeeItemProps) => ReactNode;
  accounts?: AccountEntity[];
  payees?: PayeeEntity[];
};

export default function PayeeAutocomplete({
  value,
  inputProps,
  showMakeTransfer = true,
  showManagePayees = false,
  tableBehavior,
  embedded,
  closeOnBlur,
  onUpdate,
  onSelect,
  onManagePayees,
  renderCreatePayeeButton = defaultRenderCreatePayeeButton,
  renderGroupHeader = defaultRenderGroupHeader,
  renderPayeeItem = defaultRenderPayeeItem,
  accounts,
  payees,
  ...props
}: PayeeAutocompleteProps) {
  let cachedPayees = useCachedPayees();
  if (!payees) {
    payees = cachedPayees;
  }

  let cachedAccounts = useCachedAccounts();
  if (!accounts) {
    accounts = cachedAccounts;
  }

  let [focusTransferPayees, setFocusTransferPayees] = useState(false);
  let [rawPayee, setRawPayee] = useState('');
  let hasPayeeInput = !!rawPayee;
  let payeeSuggestions = useMemo(() => {
    const suggestions = getPayeeSuggestions(
      payees,
      focusTransferPayees,
      accounts,
    );

    if (!hasPayeeInput) {
      return suggestions;
    }
    return [{ id: 'new', name: '' }, ...suggestions];
  }, [payees, focusTransferPayees, accounts, hasPayeeInput]);

  let dispatch = useDispatch();

  async function handleSelect(value, rawInputValue) {
    if (tableBehavior) {
      onSelect?.(makeNew(value, rawInputValue));
    } else {
      let create = () => dispatch(createPayee(rawInputValue));

      if (Array.isArray(value)) {
        value = await Promise.all(value.map(v => (v === 'new' ? create() : v)));
      } else {
        if (value === 'new') {
          value = await create();
        }
      }
      onSelect?.(value);
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
      tableBehavior={tableBehavior}
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
        onBlur: () => {
          setRawPayee('');
          setPayeeFieldFocused(false);
        },
        onFocus: () => setPayeeFieldFocused(true),
        onChange: setRawPayee,
      }}
      onUpdate={(value, inputValue) =>
        onUpdate && onUpdate(makeNew(value, inputValue))
      }
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
          let r1 = p1.name.toLowerCase().startsWith(value.toLowerCase());
          let r2 = p2.name.toLowerCase().startsWith(value.toLowerCase());
          let r1exact = p1.name.toLowerCase() === value.toLowerCase();
          let r2exact = p2.name.toLowerCase() === value.toLowerCase();

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

        let isf = filtered.length > 100;
        filtered = filtered.slice(0, 100);
        filtered.filtered = isf;

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
          getItemProps={getItemProps}
          highlightedIndex={highlightedIndex}
          inputValue={inputValue}
          embedded={embedded}
          renderGroupHeader={renderGroupHeader}
          renderCreatePayeeButton={renderCreatePayeeButton}
          renderPayeeItem={renderPayeeItem}
          footer={
            <AutocompleteFooter embedded={embedded}>
              {showMakeTransfer && (
                <Button
                  type={focusTransferPayees ? 'menuSelected' : 'menu'}
                  style={showManagePayees && { marginBottom: 5 }}
                  onClick={() => {
                    onUpdate?.(null);
                    setFocusTransferPayees(!focusTransferPayees);
                  }}
                >
                  Make Transfer
                </Button>
              )}
              {showManagePayees && (
                <Button type="menu" onClick={() => onManagePayees()}>
                  Manage Payees
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
  payeeName: string;
  Icon?: ComponentType<SVGProps<SVGElement>>;
  style?: CSSProperties;
};

export function CreatePayeeButton({
  payeeName,
  Icon,
  style,
  ...props
}: CreatePayeeButtonProps) {
  const isNarrowWidth = useResponsive();
  return (
    <View
      style={{
        display: 'block',
        color: theme.noticeTextMenu,
        borderRadius: 4,
        fontSize: isNarrowWidth ? 'inherit' : 11,
        fontWeight: 500,
        ...style,
      }}
      data-testid="create-payee-button"
      {...props}
    >
      {Icon ? (
        <Icon style={{ marginRight: 5, display: 'inline-block' }} />
      ) : (
        <Add
          width={8}
          height={8}
          style={{ marginRight: 5, display: 'inline-block' }}
        />
      )}
      Create Payee “{payeeName}”
    </View>
  );
}

function defaultRenderCreatePayeeButton(
  props: CreatePayeeButtonProps,
): ReactNode {
  return <CreatePayeeButton {...props} />;
}

type PayeeGroupHeaderProps = {
  title: string;
  style?: CSSProperties;
};

export function PayeeGroupHeader({
  title,
  style,
  ...props
}: PayeeGroupHeaderProps) {
  return (
    <div
      style={{
        color: theme.menuAutoCompleteTextHeader,
        padding: '4px 9px',
        ...style,
      }}
      data-testid={`${title}-payee-item-group`}
      {...props}
    >
      {title}
    </div>
  );
}

function defaultRenderGroupHeader(props: PayeeGroupHeaderProps): ReactNode {
  return <PayeeGroupHeader {...props} />;
}

type PayeeItemProps = {
  item: PayeeEntity;
  className?: string;
  style?: CSSProperties;
  highlighted?: boolean;
  embedded?: boolean;
};

export function PayeeItem({
  item,
  className,
  highlighted,
  embedded,
  ...props
}: PayeeItemProps) {
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
      className={`${className} ${css([
        {
          backgroundColor: highlighted
            ? theme.menuAutoCompleteBackgroundHover
            : 'transparent',
          borderRadius: embedded ? 4 : 0,
          padding: 4,
          paddingLeft: 20,
        },
      ])}`}
      data-testid={`${item.name}-payee-item`}
      data-highlighted={highlighted || undefined}
      {...props}
    >
      {item.name}
    </div>
  );
}

function defaultRenderPayeeItem(props: PayeeItemProps): ReactNode {
  return <PayeeItem {...props} />;
}
