import React from 'react';

import { type AccountEntity } from 'loot-core/src/types/models';

import { View } from '../common/View';

import { AccountRow } from './AccountRow';

type AccountsListProps = {
  accounts: AccountEntity[];
  hoveredAccount?: string | undefined;
  onHover: (id: AccountEntity['id']) => void;
  onAction: (account: AccountEntity, action: 'link' | 'edit') => void;
};

export function AccountsList({
  accounts,
  hoveredAccount,
  onHover,
  onAction,
}: AccountsListProps) {
  if (accounts.length === 0) {
    return null;
  }

  return (
    <View>
      {accounts.map(account => {
        const hovered = hoveredAccount === account.id;

        return (
          <AccountRow
            key={account.id}
            account={account}
            hovered={hovered}
            onHover={onHover}
            onAction={onAction}
          />
        );
      })}
    </View>
  );
}
