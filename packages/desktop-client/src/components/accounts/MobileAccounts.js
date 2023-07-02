import React, { Component, useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import * as actions from 'loot-core/src/client/actions';
import * as queries from 'loot-core/src/client/queries';

import { colors, styles } from '../../style';
import { withThemeColor } from '../../util/withThemeColor';
import { Button, Text, TextOneLine, View } from '../common';
import { Page } from '../Page';
import CellValue from '../spreadsheet/CellValue';

function AccountHeader({ name, amount }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        marginTop: 28,
        marginBottom: 10,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.text,
            { textTransform: 'uppercase', color: colors.n5, fontSize: 13 },
          ]}
          data-testid="name"
        >
          {name}
        </Text>
      </View>
      <CellValue
        binding={amount}
        style={[styles.text, { color: colors.n5, fontSize: 13 }]}
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
        backgroundColor: 'white',
        boxShadow: `0 1px 1px ${colors.n7}`,
        borderRadius: 6,
        marginTop: 10,
      }}
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
              style={[
                styles.text,
                {
                  fontSize: 17,
                  fontWeight: 600,
                  color: updated ? colors.b2 : colors.n2,
                  paddingRight: 30,
                },
              ]}
            >
              {account.name}
            </TextOneLine>
            {account.bankId && (
              <View
                style={{
                  backgroundColor: colors.g5,
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
          style={{ fontSize: 16, color: colors.n3 }}
          getStyle={value => value < 0 && { color: colors.r4 }}
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
        primary
        style={{ marginTop: 20, alignSelf: 'center' }}
        onClick={() =>
          alert(
            'Account creation is not supported on mobile on the self-hosted service yet',
          )
        }
      >
        Add Account
      </Button>

      <Text style={{ marginTop: 20, color: colors.n5 }}>
        In the future, you can add accounts using the add button in the header.
      </Text>
    </View>
  );
}

class AccountList extends Component {
  isNewTransaction = id => {
    return this.props.newTransactions.includes(id);
  };

  render() {
    const {
      accounts,
      updatedAccounts,
      // transactions,
      // categories,
      getBalanceQuery,
      getOnBudgetBalance,
      getOffBudgetBalance,
      onAddAccount,
      onSelectAccount,
      // onSelectTransaction,
      // refreshControl
    } = this.props;
    const budgetedAccounts = accounts.filter(
      account => account.offbudget === 0,
    );
    const offbudgetAccounts = accounts.filter(
      account => account.offbudget === 1,
    );

    // If there are no accounts, show a helpful message
    if (accounts.length === 0) {
      return <EmptyMessage onAdd={onAddAccount} />;
    }

    const accountContent = (
      <Page title="Accounts">
        <AccountHeader name="Budgeted" amount={getOnBudgetBalance()} />
        {budgetedAccounts.map((acct, idx) => (
          <AccountCard
            account={acct}
            key={acct.id}
            updated={updatedAccounts.includes(acct.id)}
            getBalanceQuery={getBalanceQuery}
            onSelect={onSelectAccount}
          />
        ))}

        <AccountHeader name="Off budget" amount={getOffBudgetBalance()} />
        {offbudgetAccounts.map((acct, idx) => (
          <AccountCard
            account={acct}
            key={acct.id}
            updated={updatedAccounts.includes(acct.id)}
            getBalanceQuery={getBalanceQuery}
            onSelect={onSelectAccount}
          />
        ))}

        {/*<Label
          title="RECENT TRANSACTIONS"
          style={{
            textAlign: 'center',
            marginTop: 50,
            marginBottom: 20,
            marginLeft: 10
          }}
          />*/}
      </Page>
    );

    return (
      <View style={{ flex: 1 }}>
        {/* <TransactionList
          transactions={transactions}
          categories={categories}
          isNew={this.isNewTransaction}
          scrollProps={{
            ListHeaderComponent: accountContent
          }}
          // refreshControl={refreshControl}
          onSelect={onSelectTransaction}
        /> */}
        {accountContent}
      </View>
    );
  }
}

function Accounts(props) {
  const transactions = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const getAccounts = async () => {
      if (props.categories.length === 0) {
        await props.getCategories();
      }

      props.getAccounts();
    };

    getAccounts();
  }, []);

  // const sync = async () => {
  //   await props.syncAndDownload();
  // };

  const onSelectAccount = id => {
    navigate(`/accounts/${id}`);
  };

  const onSelectTransaction = transaction => {
    navigate(`/transaction/${transaction}`);
  };

  let { accounts, categories, newTransactions, updatedAccounts, prefs } = props;
  let numberFormat = prefs.numberFormat || 'comma-dot';
  let hideFraction = prefs.hideFraction || false;

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
        // refreshControl={
        //   <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        // }
      />
    </View>
  );
}

export default connect(
  state => ({
    accounts: state.queries.accounts,
    newTransactions: state.queries.newTransactions,
    updatedAccounts: state.queries.updatedAccounts,
    categories: state.queries.categories.list,
    prefs: state.prefs.local,
  }),
  actions,
)(withThemeColor(colors.b2)(Accounts));
