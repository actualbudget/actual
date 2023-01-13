import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';

import {
  Button,
  InputWithContent,
  Label,
  View
} from 'loot-design/src/components/common';
import CellValue from 'loot-design/src/components/spreadsheet/CellValue';
import Text from 'loot-design/src/components/Text';
import { colors, styles } from 'loot-design/src/style';
import Add from 'loot-design/src/svg/v1/Add';
import CheveronLeft from 'loot-design/src/svg/v1/CheveronLeft';
import SearchAlternate from 'loot-design/src/svg/v2/SearchAlternate';

import { TransactionList } from './MobileTransaction';

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
          margin: '11px auto 4px',
          borderRadius: 4,
          padding: 10,
          width: '100%'
        }}
      >
        <InputWithContent
          leftContent={
            <SearchAlternate
              style={{
                width: 13,
                height: 13,
                flexShrink: 0,
                color: text ? colors.p7 : 'inherit',
                margin: 5,
                marginRight: 0
              }}
            />
          }
          value={text}
          onUpdate={this.onChange}
          placeholder={`Search ${accountName}`}
          style={{
            backgroundColor: colors.n11,
            border: `1px solid ${colors.n9}`,
            fontSize: 15,
            flex: 1,
            height: 32,
            marginLeft: 4,
            padding: 8
          }}
        />
      </View>
    );
  }
}

const LEFT_RIGHT_FLEX_WIDTH = 70;
export default function AccountDetails({
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
  onSelectTransaction
  // refreshControl
}) {
  let allTransactions = useMemo(() => {
    return prependTransactions.concat(transactions);
  }, [prependTransactions, transactions]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.n11,
        overflowY: 'hidden',
        width: '100%'
      }}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.n11,
          flexShrink: 0,
          overflowY: 'hidden',
          paddingTop: 20,
          top: 0,
          width: '100%'
        }}
      >
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: '100%'
          }}
        >
          <Link
            to="/accounts"
            style={{
              alignItems: 'center',
              display: 'flex',
              textDecoration: 'none',
              width: LEFT_RIGHT_FLEX_WIDTH
            }}
          >
            <CheveronLeft
              style={{
                color: colors.b5,
                width: 32,
                height: 32
              }}
            />
            <Text style={{ ...styles.text, color: colors.b5, fontWeight: 500 }}>
              Back
            </Text>
          </Link>
          <View
            style={{
              fontSize: 16,
              fontWeight: 500
            }}
          >
            {account.name}
          </View>
          {/* 
              TODO: connect to an add transaction modal 
              Only left here but hidden for flex centering of the account name.
          */}
          <Link to="transaction/new" style={{ visibility: 'hidden' }}>
            <Button
              bare
              style={{ justifyContent: 'center', width: LEFT_RIGHT_FLEX_WIDTH }}
            >
              <Add width={20} height={20} />
            </Button>
          </Link>
        </View>
        <Label title="BALANCE" style={{ marginTop: 10 }} />
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
        // refreshControl={refreshControl}
        onLoadMore={onLoadMore}
        onSelect={onSelectTransaction}
      />
    </View>
  );
}
