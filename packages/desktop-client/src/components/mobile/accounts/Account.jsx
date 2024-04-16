import React from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import { useAccount } from '../../../hooks/useAccount';
import { useFailedAccounts } from '../../../hooks/useFailedAccounts';
import { useLocalPref } from '../../../hooks/useLocalPref';
import { useNavigate } from '../../../hooks/useNavigate';
import { useSetThemeColor } from '../../../hooks/useSetThemeColor';
import { theme, styles } from '../../../style';
import { Button } from '../../common/Button';
import { Text } from '../../common/Text';
import { View } from '../../common/View';

import { AccountTransactions } from './AccountTransactions';

export function Account() {
  const failedAccounts = useFailedAccounts();
  const syncingAccountIds = useSelector(state => state.account.accountsSyncing);

  const navigate = useNavigate();

  const [_numberFormat] = useLocalPref('numberFormat');
  const numberFormat = _numberFormat || 'comma-dot';
  const [hideFraction = false] = useLocalPref('hideFraction');

  const { id: accountId } = useParams();

  useSetThemeColor(theme.mobileViewTheme);

  const account = useAccount(accountId);

  if (!account) {
    return null;
  }

  if (
    accountId === 'budgeted' ||
    accountId === 'offbudget' ||
    accountId === 'uncategorized'
  ) {
    return (
      <View style={{ flex: 1, padding: 30 }}>
        <Text style={(styles.text, { textAlign: 'center' })}>
          There is no Mobile View at the moment
        </Text>
        <Button
          type="normal"
          style={{ fontSize: 15, marginLeft: 10, marginTop: 10 }}
          onClick={() => navigate('/accounts')}
        >
          Go back to Mobile Accounts
        </Button>
      </View>
    );
  }

  return (
    <AccountTransactions
      // This key forces the whole table rerender when the number
      // format changes
      key={numberFormat + hideFraction}
      account={account}
      pending={syncingAccountIds.includes(account.id)}
      failed={failedAccounts && failedAccounts.has(account.id)}
    />
  );
}
