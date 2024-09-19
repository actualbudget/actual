// @ts-strict-ignore
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import * as queries from 'loot-core/src/client/queries';
import { type State } from 'loot-core/src/client/state-types';
import { AccountEntity } from 'loot-core/types/models';

import { useFailedAccounts } from '../../hooks/useFailedAccounts';
import { useLocalPref } from '../../hooks/useLocalPref';
import { useUpdatedAccounts } from '../../hooks/useUpdatedAccounts';

import { type SheetFields, type Binding } from '../spreadsheet';
import { type OnDropCallback } from '../sort';

import { type CSSProperties } from '../../style';
import { View } from '../common/View';
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
  const [isDragging, setIsDragging] = useState(false);
  const failedAccounts = useFailedAccounts();
  const updatedAccounts = useUpdatedAccounts();
  const syncingAccountIds = useSelector(
    (state: State) => state.account.accountsSyncing,
  );

  const getAccountPath = account => `/accounts/${account.id}`;

  const [collapsed, setCollapsedGroupsPref] = useLocalPref(
    'ui.collapsedAccountGroups',
  );

  if (!collapsed || !Object.hasOwn(collapsed, groupName.replace(/\s/g, ''))) {
    let c = (collapsed ? { ...collapsed } : {});
    c[groupName.replace(/\s/g, "")] = false;
    setCollapsedGroupsPref(c);
  }

  function onDragChange(drag) {
    setIsDragging(drag.state === 'start');
  }

  const toggleAccounts = () => {
    let c = {...collapsed};
    c[groupName.replace(/\s/g, "")] = !collapsed[groupName.replace(/\s/g, '')];
    setCollapsedGroupsPref(c);
  }

  const accountGroupStyle = {
    background:'var(--color-tableBackground)',
    borderRadius: '10px',
    margin: '10px',
    border: '2px solid var(--color-tableBorder)'
  };

  return (
    <View style={{ flexShrink: 0, padding: '5px 0', ...style, }}>
      <AccountGroupName
        groupName={t(groupName)}
        to={groupTo}
        query={groupQuery}
        toggleAccounts={toggleAccounts}
        collapsed={collapsed?.[groupName.replace(/\s/g, "")]}
      />

      {!collapsed?.[groupName.replace(/\s/g, "")] && accountList?.map((account, i) => (
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