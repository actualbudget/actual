// @ts-strict-ignore
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import * as queries from 'loot-core/src/client/queries';
import { moveAccount } from 'loot-core/src/client/actions';

import { useAccounts } from '../../hooks/useAccounts';
import { useBudgetedAccounts } from '../../hooks/useBudgetedAccounts';
import { useClosedAccounts } from '../../hooks/useClosedAccounts';
import { useOffBudgetAccounts } from '../../hooks/useOffBudgetAccounts';
import { View } from '../common/View';
import { AccountGroup } from './AccountGroup';
import { AccountGroupName } from './AccountGroupName';

type AccountsProps = {
};

export function Accounts({
}: AccountsProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const accounts = useAccounts();
  const offbudgetAccounts = useOffBudgetAccounts();
  const budgetedAccounts = useBudgetedAccounts();
  const closedAccounts = useClosedAccounts();

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

  return (
    <View>
      <AccountGroupName
        groupName={t('All accounts')}
        query={queries.allAccountBalance()}
        to="/accounts"
        outerStyle={{ overflowY: 'scroll', margin: '5px 0', }}
        style={{ paddingLeft: 0 }}
      />

      <View style={{ overflowY: 'scroll', }}>
        {budgetedAccounts.length > 0 && (
          <AccountGroup
            groupName={t('For budget')}
            groupQuery={queries.budgetedAccountBalance()}
            groupTo="/accounts/budgeted"
            accountList={budgetedAccounts}
            onReorder={onReorder}
          />
        )}

        {offbudgetAccounts.length > 0 && (
          <AccountGroup
            groupName={t('Off budget')}
            groupQuery={queries.offbudgetAccountBalance()}
            groupTo="/accounts/offbudget"
            accountList={offbudgetAccounts}
            onReorder={onReorder}
          />
        )}

        {closedAccounts.length > 0 && (
          <AccountGroup
            groupName={t('Closed accounts')}
            accountList={closedAccounts}
            onReorder={onReorder}
          />
        )}
      </View>
    </View>
  );
}
