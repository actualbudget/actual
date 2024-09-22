// @ts-strict-ignore
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import * as queries from 'loot-core/src/client/queries';
import { type State } from 'loot-core/src/client/state-types';
import { type AccountEntity } from 'loot-core/types/models';

import { useFailedAccounts } from '../../hooks/useFailedAccounts';
import { useLocalPref } from '../../hooks/useLocalPref';
import { useUpdatedAccounts } from '../../hooks/useUpdatedAccounts';
import { type CSSProperties } from '../../style';
import { View } from '../common/View';
import { type OnDropCallback } from '../sort';
import { type SheetFields, type Binding } from '../spreadsheet';

import { Account } from './Account';
import { AccountGroupName } from './AccountGroupName';

type AccountGroupProps<FieldName extends SheetFields<'account'>> = {
  groupName: string;
  groupQuery?: Binding<'account', FieldName>;
  groupTo?: string;
  accountList?: AccountEntity[];
  onReorder?: OnDropCallback;
  style?: CSSProperties;
};

export function AccountGroup<FieldName extends SheetFields<'account'>>({
  groupName,
  groupQuery,
  groupTo,
  accountList,
  onReorder,
  style,
}: AccountGroupProps<FieldName>) {
  const { t } = useTranslation();
  const failedAccounts = useFailedAccounts();
  const updatedAccounts = useUpdatedAccounts();
  const syncingAccountIds = useSelector(
    (state: State) => state.account.accountsSyncing,
  );

  const getAccountPath = (account: AccountEntity) => `/accounts/${account.id}`;

  function onDragChange() {}

  const [collapsed, setCollapsedGroupsPref] = useLocalPref(
    'ui.collapsedAccountGroups',
  );

  const toggleAccounts = () => {
    const c = collapsed ? { ...collapsed } : {};
    c[groupName.replace(/\s/g, '')] =
      !collapsed || !Object.hasOwn(collapsed, groupName.replace(/\s/g, ''))
        ? true
        : !collapsed[groupName.replace(/\s/g, '')];
    setCollapsedGroupsPref(c);
  };

  /*
  const accountGroupStyle = {
    background: 'var(--color-tableBackground)',
    borderRadius: '10px',
    margin: '10px',
    border: '2px solid var(--color-tableBorder)',
  };
  */

  return (
    <View style={{ flexShrink: 0, padding: '5px 0', ...style }}>
      <AccountGroupName
        groupName={t(groupName)}
        to={groupTo}
        query={groupQuery}
        toggleAccounts={toggleAccounts}
        collapsed={collapsed?.[groupName.replace(/\s/g, '')]}
      />

      {!collapsed?.[groupName.replace(/\s/g, '')] &&
        accountList?.map(account => (
          <Account
            key={account.id}
            name={account.name}
            account={account}
            connected={!!account.bank}
            pending={syncingAccountIds.includes(account.id)}
            failed={failedAccounts?.has(account.id)}
            updated={updatedAccounts?.includes(account.id)}
            to={getAccountPath(account)}
            query={queries.accountBalance(account)}
            onDragChange={onDragChange}
            onDrop={onReorder}
          />
        ))}
    </View>
  );
}
