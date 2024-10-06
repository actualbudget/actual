// @ts-strict-ignore
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { moveAccount } from 'loot-core/src/client/actions';
import * as queries from 'loot-core/src/client/queries';
import { type State } from 'loot-core/src/client/state-types';
import { type AccountEntity } from 'loot-core/types/models';

import { useAccounts } from '../../hooks/useAccounts';
import { useBudgetedAccounts } from '../../hooks/useBudgetedAccounts';
import { useClosedAccounts } from '../../hooks/useClosedAccounts';
import { useFailedAccounts } from '../../hooks/useFailedAccounts';
import { useLocalPref } from '../../hooks/useLocalPref';
import { useOffBudgetAccounts } from '../../hooks/useOffBudgetAccounts';
import { useUpdatedAccounts } from '../../hooks/useUpdatedAccounts';
import { useResponsive } from '../../ResponsiveProvider';
import { theme } from '../../style';
import { View } from '../common/View';

import { Account } from './Account';
import { SecondaryItem } from './SecondaryItem';

const fontWeight = 600;

export function Accounts() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { height } = useResponsive();
  const [isDragging, setIsDragging] = useState(false);
  const accounts = useAccounts();
  const failedAccounts = useFailedAccounts();
  const updatedAccounts = useUpdatedAccounts();
  const offbudgetAccounts = useOffBudgetAccounts();
  const budgetedAccounts = useBudgetedAccounts();
  const closedAccounts = useClosedAccounts();
  const syncingAccountIds = useSelector(
    (state: State) => state.account.accountsSyncing,
  );

  const getAccountPath = (account: AccountEntity) => `/accounts/${account.id}`;

  const [showClosedAccounts, setShowClosedAccountsPref] = useLocalPref(
    'ui.showClosedAccounts',
  );

  function onDragChange(drag) {
    setIsDragging(drag.state === 'start');
  }

  const makeDropPadding = (i: number) => {
    if (i === 0) {
      return {
        paddingTop: isDragging ? 15 : 0,
        marginTop: isDragging ? -15 : 0,
      };
    }
    return undefined;
  };

  async function onReorder(
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

  const onToggleClosedAccounts = () => {
    setShowClosedAccountsPref(!showClosedAccounts);
  };

  return (
    <View style={{ flexGrow: 1, ...(height < 480 && { minHeight: 'auto' }) }}>
      <View
        style={{
          height: 1,
          backgroundColor: theme.sidebarItemBackgroundHover,
          marginTop: 15,
          flexShrink: 0,
        }}
      />

      <View style={{ overflow: 'auto' }}>
        <Account
          name={t('All accounts')}
          to="/accounts"
          query={queries.allAccountBalance()}
          style={{ fontWeight, marginTop: 15 }}
        />

        {budgetedAccounts.length > 0 && (
          <Account
            name={t('For budget')}
            to="/accounts/budgeted"
            query={queries.budgetedAccountBalance()}
            style={{
              fontWeight,
              marginTop: 13,
              marginBottom: 5,
            }}
          />
        )}

        {budgetedAccounts.map((account, i) => (
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
            outerStyle={makeDropPadding(i)}
          />
        ))}

        {offbudgetAccounts.length > 0 && (
          <Account
            name={t('Off budget')}
            to="/accounts/offbudget"
            query={queries.offbudgetAccountBalance()}
            style={{
              fontWeight,
              marginTop: 13,
              marginBottom: 5,
            }}
          />
        )}

        {offbudgetAccounts.map((account, i) => (
          <Account
            key={account.id}
            name={account.name}
            account={account}
            connected={!!account.bank}
            pending={syncingAccountIds.includes(account.id)}
            failed={failedAccounts && failedAccounts.has(account.id)}
            updated={updatedAccounts && updatedAccounts.includes(account.id)}
            to={getAccountPath(account)}
            query={queries.accountBalance(account)}
            onDragChange={onDragChange}
            onDrop={onReorder}
            outerStyle={makeDropPadding(i)}
          />
        ))}

        {closedAccounts.length > 0 && (
          <SecondaryItem
            style={{ marginTop: 15 }}
            title={
              showClosedAccounts
                ? t('Closed accounts')
                : t('Closed accounts...')
            }
            onClick={onToggleClosedAccounts}
            bold
          />
        )}

        {showClosedAccounts &&
          closedAccounts.map(account => (
            <Account
              key={account.id}
              name={account.name}
              account={account}
              to={getAccountPath(account)}
              query={queries.accountBalance(account)}
              onDragChange={onDragChange}
              onDrop={onReorder}
            />
          ))}
      </View>
    </View>
  );
}
