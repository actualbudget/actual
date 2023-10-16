import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import * as queries from 'loot-core/src/client/queries';

import { useActions } from '../../hooks/useActions';
import useCategories from '../../hooks/useCategories';
import useNavigate from '../../hooks/useNavigate';
import { useSetThemeColor } from '../../hooks/useSetThemeColor';
import { theme, styles } from '../../style';
import Button from '../common/Button';
import Text from '../common/Text';
import TextOneLine from '../common/TextOneLine';
import View from '../common/View';
import { Page } from '../Page';
import PullToRefresh from '../responsive/PullToRefresh';
import CellValue from '../spreadsheet/CellValue';

function AccountHeader({ name, amount, style = {} }) {
  return (
    <View
      style={{
        flex: '1 0 auto',
        flexDirection: 'row',
        marginTop: 10,
        color: theme.altpageTextSubdued,
        ...style,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            ...styles.text,
            textTransform: 'uppercase',
            fontSize: 13,
          }}
          data-testid="name"
        >
          {name}
        </Text>
      </View>
      <CellValue
        binding={amount}
        style={{ ...styles.text, fontSize: 13 }}
        type="financial"
      />
    </View>
  );
}

function AccountCard({ account, updated, getBalanceQuery, onSelect }) {
  return (
    <View
      style={{
        flex: '1 0 auto',
        flexDirection: 'row',
        backgroundColor: theme.tableBackground,
        boxShadow: `0 1px 1px ${theme.mobileAccountShadow}`,
        borderRadius: 6,
        marginTop: 10,
      }}
      data-testid="account"
    >
      <Button
        onMouseDown={() => onSelect(account.id)}
        style={{
          flexDirection: 'row',
          flex: 1,
          alignItems: 'center',
          borderRadius: 6,
          '&:active': {
            opacity: 0.1,
          },
        }}
      >
        <View
          style={{
            flex: '1 auto',
            margin: '10px 0',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <TextOneLine
              style={{
                ...styles.text,
                fontSize: 17,
                fontWeight: 600,
                color: updated ? theme.mobileAccountText : theme.pillText,
                paddingRight: 30,
              }}
              data-testid="account-name"
            >
              {account.name}
            </TextOneLine>
            {account.bankId && (
              <View
                style={{
                  backgroundColor: theme.noticeBackgroundDark,
                  marginLeft: '-23px',
                  width: 8,
                  height: 8,
                  borderRadius: 8,
                }}
              />
            )}
          </View>
        </View>
        <CellValue
          binding={getBalanceQuery(account)}
          type="financial"
          style={{ fontSize: 16, color: 'inherit' }}
          getStyle={value => value < 0 && { color: 'inherit' }}
          data-testid="account-balance"
        />
      </Button>
    </View>
  );
}

function EmptyMessage({ onAdd }) {
  return (
    <View style={{ flex: 1, padding: 30 }}>
      <Text style={styles.text}>
        For Actual to be useful, you need to add an account. You can link an
        account to automatically download transactions, or manage it locally
        yourself.
      </Text>

      <Button
        type="primary"
        style={{ marginTop: 20, alignSelf: 'center' }}
        onClick={() =>
          alert(
            'Account creation is not supported on mobile on the self-hosted service yet',
          )
        }
      >
        Add Account
      </Button>

      <Text style={{ marginTop: 20, color: theme.altpageTextSubdued }}>
        In the future, you can add accounts using the add button in the header.
      </Text>
    </View>
  );
}

function AccountList({
  accounts,
  updatedAccounts,
  getBalanceQuery,
  getOnBudgetBalance,
  getOffBudgetBalance,
  onAddAccount,
  onSelectAccount,
}) {
  const { syncAndDownload } = useActions();

  const budgetedAccounts = accounts.filter(account => account.offbudget === 0);
  const offbudgetAccounts = accounts.filter(account => account.offbudget === 1);

  // If there are no accounts, show a helpful message
  if (accounts.length === 0) {
    return <EmptyMessage onAdd={onAddAccount} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Page title="Accounts">
        <PullToRefresh onRefresh={syncAndDownload}>
          <AccountHeader name="For Budget" amount={getOnBudgetBalance()} />
          {budgetedAccounts.map(acct => (
            <AccountCard
              account={acct}
              key={acct.id}
              updated={updatedAccounts.includes(acct.id)}
              getBalanceQuery={getBalanceQuery}
              onSelect={onSelectAccount}
            />
          ))}

          <AccountHeader
            name="Off budget"
            amount={getOffBudgetBalance()}
            style={{ marginTop: 30 }}
          />
          {offbudgetAccounts.map(acct => (
            <AccountCard
              account={acct}
              key={acct.id}
              updated={updatedAccounts.includes(acct.id)}
              getBalanceQuery={getBalanceQuery}
              onSelect={onSelectAccount}
            />
          ))}
        </PullToRefresh>
      </Page>
    </View>
  );
}

export default function Accounts() {
  let accounts = useSelector(state => state.queries.accounts);
  let newTransactions = useSelector(state => state.queries.newTransactions);
  let updatedAccounts = useSelector(state => state.queries.updatedAccounts);
  let numberFormat = useSelector(
    state => state.prefs.local.numberFormat || 'comma-dot',
  );
  let hideFraction = useSelector(
    state => state.prefs.local.hideFraction || false,
  );

  const { list: categories } = useCategories();
  let { getAccounts } = useActions();

  const transactions = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    (async () => getAccounts())();
  }, []);

  const onSelectAccount = id => {
    navigate(`/accounts/${id}`);
  };

  const onSelectTransaction = transaction => {
    navigate(`/transaction/${transaction}`);
  };

  useSetThemeColor(theme.mobileAccountsViewTheme);

  return (
    <View style={{ flex: 1 }}>
      <AccountList
        // This key forces the whole table rerender when the number
        // format changes
        key={numberFormat + hideFraction}
        accounts={accounts.filter(account => !account.closed)}
        categories={categories}
        transactions={transactions || []}
        updatedAccounts={updatedAccounts}
        newTransactions={newTransactions}
        getBalanceQuery={queries.accountBalance}
        getOnBudgetBalance={queries.budgetedAccountBalance}
        getOffBudgetBalance={queries.offbudgetAccountBalance}
        onAddAccount={() => {}} // () => navigate('AddAccountModal')
        onSelectAccount={onSelectAccount}
        onSelectTransaction={onSelectTransaction}
      />
    </View>
  );
}
