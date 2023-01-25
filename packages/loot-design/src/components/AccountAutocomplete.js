import React from 'react';

import { useCachedAccounts } from 'loot-core/src/client/data-hooks/accounts';

import { colors } from '../style';

import Autocomplete from './Autocomplete';
import { View } from './common';

export function AccountList({
  items,
  getItemProps,
  highlightedIndex,
  embedded
}) {
  let lastItem = null;

  return (
    <View>
      <View
        style={[
          { overflow: 'auto', padding: '5px 0' },
          !embedded && { maxHeight: 175 }
        ]}
      >
        {items.map((item, idx) => {
          const showGroup = lastItem
            ? item.offbudget !== lastItem.offbudget
            : true;
          const group = item.offbudget ? 'Off Budget' : 'For Budget';
          lastItem = item;

          return [
            showGroup ? (
              <div
                key={group}
                style={{
                  color: colors.y9,
                  padding: '4px 9px'
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
                borderRadius: embedded ? 4 : 0
              }}
              data-testid={
                'account-item' +
                (highlightedIndex === idx ? '-highlighted' : '')
              }
            >
              {item.name}
            </div>
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

  return (
    <Autocomplete
      strict={true}
      highlightFirst={true}
      embedded={embedded}
      suggestions={
        includeClosedAccounts
          ? accounts
          : accounts.filter(a => a.closed === false)
      }
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
