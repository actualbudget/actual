import React from 'react';
import { View, Text } from 'react-native';
import { RectButton } from 'react-native-gesture-handler';

import { prettyAccountType } from 'loot-core/src/shared/accounts';

import { colors, styles } from '../../style';
import Wallet from '../../svg/v1/Wallet';
import CellValue from '../spreadsheet/CellValue';
import { Button, TextOneLine } from './common';
import { TransactionList } from './transaction';

export function AccountHeader({ name, amount }) {
  return (
    <View style={{ marginTop: 40, flexDirection: 'row', marginHorizontal: 10 }}>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.text,
            { textTransform: 'uppercase', color: colors.n5, fontSize: 13 }
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

export function Account({
  account,
  updated,
  getBalanceQuery,
  index,
  onSelect
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: 'white',
        marginHorizontal: 10,
        marginTop: 10,
        shadowColor: '#9594A8',
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 1,
        shadowOpacity: 1,
        borderRadius: 6
      }}
    >
      <RectButton
        onPress={() => onSelect(account.id)}
        activeOpacity={0.1}
        style={{
          flexDirection: 'row',
          flex: 1,
          alignItems: 'center',
          borderRadius: 6,
          paddingHorizontal: 16,
          paddingVertical: 15
        }}
      >
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            <TextOneLine
              style={[
                styles.text,
                {
                  fontSize: 17,
                  fontWeight: '600',
                  color: updated ? colors.b2 : colors.n2,
                  paddingRight: 30
                }
              ]}
            >
              {account.name}
            </TextOneLine>
            {account.bankId && (
              <View
                style={{
                  backgroundColor: colors.g5,
                  marginLeft: -23,
                  width: 8,
                  height: 8,
                  borderRadius: 8
                }}
              />
            )}
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 4
            }}
          >
            <Text
              style={[
                styles.text,
                { fontSize: 13, lineHeight: 13, color: colors.n5 }
              ]}
            >
              {prettyAccountType(account.type)}
            </Text>
            <Wallet
              style={{
                width: 15,
                height: 15,
                color: colors.n9,
                marginLeft: 8,
                marginBottom: 2
              }}
            />
          </View>
        </View>
        <CellValue
          binding={getBalanceQuery(account)}
          type="financial"
          style={{ fontSize: 16, color: colors.n3 }}
          getStyle={value => value < 0 && { color: colors.r4 }}
        />
      </RectButton>
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
        onPress={onAdd}
      >
        Add Account
      </Button>

      <Text style={{ marginTop: 20, color: colors.n5, lineHeight: 19 }}>
        In the future, you can add accounts using the add button in the header.
      </Text>
    </View>
  );
}

export class AccountList extends React.Component {
  isNewTransaction = id => {
    return this.props.newTransactions.includes(id);
  };

  render() {
    const {
      accounts,
      updatedAccounts,
      transactions,
      categories,
      getBalanceQuery,
      getOnBudgetBalance,
      getOffBudgetBalance,
      onAddAccount,
      onSelectAccount,
      onSelectTransaction,
      refreshControl
    } = this.props;
    const budgetedAccounts = accounts.filter(
      account => account.offbudget === 0
    );
    const offbudgetAccounts = accounts.filter(
      account => account.offbudget === 1
    );

    // If there are no accounts, show a helpful message
    if (accounts.length === 0) {
      return <EmptyMessage onAdd={onAddAccount} />;
    }

    const accountContent = (
      <View
        style={{
          backgroundColor: colors.n10,
          paddingBottom: 10
        }}
      >
        <AccountHeader name="Budgeted" amount={getOnBudgetBalance()} />
        {budgetedAccounts.map((acct, idx) => (
          <Account
            account={acct}
            index={idx}
            updated={updatedAccounts.includes(acct.id)}
            getBalanceQuery={getBalanceQuery}
            onSelect={onSelectAccount}
          />
        ))}

        <AccountHeader name="Off budget" amount={getOffBudgetBalance()} />
        {offbudgetAccounts.map((acct, idx) => (
          <Account
            account={acct}
            index={idx}
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
      </View>
    );

    return (
      <View style={{ flex: 1 }}>
        <TransactionList
          transactions={transactions}
          categories={categories}
          isNew={this.isNewTransaction}
          scrollProps={{
            ListHeaderComponent: accountContent
          }}
          refreshControl={refreshControl}
          onSelect={onSelectTransaction}
        />
      </View>
    );
  }
}
