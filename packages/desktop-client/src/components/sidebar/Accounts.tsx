// @ts-strict-ignore
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { moveAccount } from 'loot-core/src/client/actions';
import * as queries from 'loot-core/src/client/queries';

import { useAccounts } from '../../hooks/useAccounts';
import { useBudgetedAccounts } from '../../hooks/useBudgetedAccounts';
import { useClosedAccounts } from '../../hooks/useClosedAccounts';
import { useOffBudgetAccounts } from '../../hooks/useOffBudgetAccounts';

import { styles } from '../../style';
import { View } from '../common/View';
import { AccountGroup } from './AccountGroup';
import { AccountGroupName } from './AccountGroupName';

export function Accounts() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const accounts = useAccounts();

  const offbudgetAccounts = useOffBudgetAccounts();
  const budgetedAccounts = useBudgetedAccounts();
  const closedAccounts = useClosedAccounts();

  async function onAccountReorder(
    id: string,
    dropPos: 'top' | 'bottom',
    targetId: unknown,
  ) {
    let targetIdToMove = targetId;
    if (dropPos === 'bottom') {
      const idx = accounts.findIndex(a => a.id === targetId) + 1;
      targetIdToMove = idx < accounts.length ? accounts[idx].id : null;
    }

    dispatch(moveAccount(id, targetIdToMove));
  }

  const groups = [
    {
      name: t('For budget'),
      query: queries.budgetedAccountBalance(),
      to: '/accounts/budgeted',
      accountList: budgetedAccounts,
      onReorder: onAccountReorder,
    },
    {
      name: t('Off budget'),
      query: queries.offbudgetAccountBalance(),
      to: '/accounts/offbudget',
      accountList: offbudgetAccounts,
      onReorder: onAccountReorder,
    },
    {
      name: t('Closed'),
      accountList: closedAccounts,
      onReorder: onAccountReorder,
    },
  ];

  return (
    <View style={{ flexGrow: 1, }}>
      <AccountGroupName
        groupName={t('All accounts')}
        query={queries.allAccountBalance()}
        to='/accounts'
        style={{...styles.mediumText}}
        outerStyle={{ margin: '5px 0', marginRight: 5 }}
      />

      <View style={{ overflowY: 'scroll' }}>
        {groups?.map((group) => (
          <AccountGroup
            key={group.name}
            groupName={group.name}
            groupQuery={group.query}
            groupTo={group.to}
            accountList={group.accountList}
            onReorder={group.onReorder}
          />
        ))}
      </View>
    </View>
  );
}
