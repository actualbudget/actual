import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { AccountTransactions } from './AccountTransactions';

import { useAccount } from '@desktop-client/hooks/useAccount';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

export function Account() {
  const { t } = useTranslation();
  const [_numberFormat] = useSyncedPref('numberFormat');
  const numberFormat = _numberFormat || 'comma-dot';
  const [hideFraction] = useSyncedPref('hideFraction');

  const { id: accountId } = useParams();

  const account = useAccount(accountId!);

  function accountNameFromId(id: string | undefined) {
    switch (id) {
      case 'onbudget':
        return t('On Budget Accounts');
      case 'offbudget':
        return t('Off Budget Accounts');
      case 'uncategorized':
        return t('Uncategorized');
      case 'closed':
        return t('Closed Accounts');
      default:
        return t('All Accounts');
    }
  }

  return (
    <AccountTransactions
      // This key forces the whole table rerender when the number
      // format changes
      key={numberFormat + hideFraction}
      account={account}
      accountId={accountId}
      accountName={account ? account.name : accountNameFromId(accountId)}
    />
  );
}
