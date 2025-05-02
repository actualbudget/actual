import React from 'react';

import { View } from '@actual-app/components/view';

import { type AccountEntity } from 'loot-core/types/models';

import { AccountRow } from './AccountRow';

import { useLocale } from '@desktop-client/hooks/useLocale';

type AccountsListProps = {
  accounts: AccountEntity[];
  hoveredAccount?: string | null;
  onHover: (id: AccountEntity['id'] | null) => void;
  onAction: (account: AccountEntity, action: 'link' | 'edit') => void;
};

export function AccountsList({
  accounts,
  hoveredAccount,
  onHover,
  onAction,
}: AccountsListProps) {
  const locale = useLocale();

  if (accounts.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        minHeight: 'initial',
      }}
    >
      {accounts.map(account => {
        const hovered = hoveredAccount === account.id;

        return (
          <AccountRow
            key={account.id}
            account={account}
            hovered={hovered}
            onHover={onHover}
            onAction={onAction}
            locale={locale}
          />
        );
      })}
    </View>
  );
}
