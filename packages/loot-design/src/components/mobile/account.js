import React, { useMemo } from 'react';
import { View, TextInput } from 'react-native';
import CellValue from '../spreadsheet/CellValue';
import { TransactionList } from './transaction';
import Search from '../../svg/v1/Search';
import { Label } from './common';
import { colors } from '../../style';

class TransactionSearchInput extends React.Component {
  state = { text: '' };

  performSearch = () => {
    this.props.onSearch(this.state.text);
  };

  onChange = text => {
    this.setState({ text }, this.performSearch);
  };

  render() {
    const { accountName } = this.props;
    const { text } = this.state;

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.n11,
          marginVertical: 11,
          marginHorizontal: 11,
          borderRadius: 4,
          padding: 10
        }}
      >
        <Search width="20" height="20" style={{ color: colors.n7 }} />
        <TextInput
          value={text}
          onChangeText={this.onChange}
          placeholder={`Search ${accountName}`}
          placeholderTextColor={colors.n7}
          style={{ fontSize: 15, flex: 1, marginLeft: 4, padding: 0 }}
        />
      </View>
    );
  }
}

export function AccountDetails({
  account,
  prependTransactions,
  transactions,
  accounts,
  categories,
  payees,
  balance,
  isNewTransaction,
  onLoadMore,
  onSearch,
  onSelectTransaction,
  refreshControl
}) {
  let allTransactions = useMemo(() => {
    return prependTransactions.concat(transactions);
  }, [prependTransactions, transactions]);

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 10 }}>
        <Label title="BALANCE" />
        <CellValue
          binding={balance}
          type="financial"
          debug={true}
          style={{
            fontSize: 18,
            fontWeight: '500'
          }}
          getStyle={value => ({
            color: value < 0 ? colors.r4 : colors.p5
          })}
        />
      </View>
      <View style={{ borderBottomWidth: 1, borderColor: colors.n9 }}>
        <TransactionSearchInput
          accountName={account.name}
          onSearch={onSearch}
        />
      </View>
      <TransactionList
        transactions={allTransactions}
        categories={categories}
        accounts={accounts}
        payees={payees}
        showCategory={!account.offbudget}
        isNew={isNewTransaction}
        refreshControl={refreshControl}
        onLoadMore={onLoadMore}
        onSelect={onSelectTransaction}
      />
    </View>
  );
}
