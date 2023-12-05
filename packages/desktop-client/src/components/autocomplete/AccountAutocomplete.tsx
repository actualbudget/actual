import React, { type ComponentProps } from 'react';

import { css } from 'glamor';

import { useCachedAccounts } from 'loot-core/src/client/data-hooks/accounts';

import { theme } from '../../style';
import View from '../common/View';

import Autocomplete from './Autocomplete';

function AccountList({
  items,
  getItemProps,
  highlightedIndex,
  embedded,
  groupHeaderStyle,
}) {
  let lastItem = null;

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
          const showGroup = lastItem
            ? (item.offbudget !== lastItem.offbudget && !item.closed) ||
              (item.closed !== lastItem.closed && !item.offbudget)
            : true;

          const group = `${
            item.closed
              ? 'Closed Accounts'
              : item.offbudget
              ? 'Off Budget'
              : 'For Budget'
          }`;

          lastItem = item;

          return [
            showGroup ? (
              <div
                key={group}
                style={{
                  color: theme.menuAutoCompleteTextHeader,
                  padding: '4px 9px',
                  ...groupHeaderStyle,
                }}
                data-testid="account-item-group"
              >
                {group}
              </div>
            ) : null,
            <div
              // List each account up to a max
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
              key={item.id}
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
                'account-item' +
                (highlightedIndex === idx ? '-highlighted' : '')
              }
            >
              {item.name}
            </div>,
          ];
        })}
      </View>
    </View>
  );
}

type AutoCompleteProps = {
  embedded?: boolean;
  includeClosedAccounts: boolean;
  groupHeaderStyle?: boolean;
  closeOnBlur?: boolean;
} & ComponentProps<typeof Autocomplete>;

export default function AccountAutocomplete({
  embedded,
  includeClosedAccounts = true,
  groupHeaderStyle,
  closeOnBlur,
  ...props
}: AutoCompleteProps) {
  let accounts = useCachedAccounts() || [];

  //remove closed accounts if needed
  //then sort by closed, then offbudget
  accounts = accounts
    .filter(item => {
      return includeClosedAccounts ? item : !item.closed;
    })
    .sort((a, b) => {
      if (a.closed === b.closed) {
        return a.offbudget === b.offbudget ? 0 : a.offbudget ? 1 : -1;
      } else {
        return a.closed ? 1 : -1;
      }
    });

  return (
    <Autocomplete
      strict={true}
      highlightFirst={true}
      embedded={embedded}
      closeOnBlur={closeOnBlur}
      suggestions={accounts}
      renderItems={(items, getItemProps, highlightedIndex) => (
        <AccountList
          items={items}
          getItemProps={getItemProps}
          highlightedIndex={highlightedIndex}
          embedded={embedded}
          groupHeaderStyle={groupHeaderStyle}
        />
      )}
      {...props}
    />
  );
}
