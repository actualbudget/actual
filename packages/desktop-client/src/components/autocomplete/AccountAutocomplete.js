import React from 'react';

import { useCachedAccounts } from 'loot-core/src/client/data-hooks/accounts';

import { colors } from '../../style';
import { View } from '../common';

import Autocomplete from './Autocomplete';

function AccountList({ items, getItemProps, highlightedIndex, embedded }) {
  let lastItem = null;

  return (
    <View>
      <View
        style={[
          { overflow: 'auto', padding: '5px 0' },
          !embedded && { maxHeight: 175 },
        ]}
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
                  color: colors.y9,
                  padding: '4px 9px',
                }}
                data-testid="account-item-group"
              >
                {group}
              </div>
            ) : null,
            <div
              {...(getItemProps ? getItemProps({ item }) : null)}
              key={item.id}
              style={{
                backgroundColor:
                  highlightedIndex === idx ? colors.n4 : 'transparent',
                padding: 4,
                paddingLeft: 20,
                borderRadius: embedded ? 4 : 0,
              }}
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

export default function AccountAutocomplete({
  embedded,
  includeClosedAccounts = true,
  ...props
}) {
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
      suggestions={accounts}
      renderItems={(items, getItemProps, highlightedIndex) => (
        <AccountList
          items={items}
          getItemProps={getItemProps}
          highlightedIndex={highlightedIndex}
          embedded={embedded}
        />
      )}
      {...props}
    />
  );
}
