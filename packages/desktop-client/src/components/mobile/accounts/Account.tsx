import React from 'react';
import { useParams } from 'react-router-dom';

import { useAccount } from '../../../hooks/useAccount';
import { useSyncedPref } from '../../../hooks/useSyncedPref';

import { AccountTransactions } from './AccountTransactions';

export function Account() {
  const [_numberFormat] = useSyncedPref('numberFormat');
  const numberFormat = _numberFormat || 'comma-dot';
  const [hideFraction] = useSyncedPref('hideFraction');

  const { id: accountId } = useParams();

  const account = useAccount(accountId!);

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

function accountNameFromId(id: string | undefined) {
  switch (id) {
    case 'onbudget':
      return 'On Budget Accounts';
    case 'offbudget':
      return 'Off Budget Accounts';
    case 'uncategorized':
      return 'Uncategorized';
    default:
      return 'All Accounts';
  }
}
