import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

import Add from '../../icons/v1/Add';
import CheveronLeft from '../../icons/v1/CheveronLeft';
import SearchAlternate from '../../icons/v2/SearchAlternate';
import { theme, styles } from '../../style';
import AnimatedRefresh from '../AnimatedRefresh';
import Button from '../common/Button';
import ButtonLink from '../common/ButtonLink';
import InputWithContent from '../common/InputWithContent';
import Label from '../common/Label';
import Text from '../common/Text';
import View from '../common/View';
import CellValue from '../spreadsheet/CellValue';
import { TransactionList } from '../transactions/MobileTransaction';

function TransactionSearchInput({ accountName, onSearch }) {
  const [text, setText] = useState('');

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.tableHeaderBackground,
        margin: '11px auto 4px',
        borderRadius: 4,
        padding: 10,
        width: '100%',
      }}
    >
      <InputWithContent
        leftContent={
          <SearchAlternate
            style={{
              width: 13,
              height: 13,
              flexShrink: 0,
              color: text ? theme.formInputTextHighlight : 'inherit',
              margin: 5,
              marginRight: 0,
            }}
          />
        }
        value={text}
        onUpdate={text => {
          setText(text);
          onSearch(text);
        }}
        placeholder={`Search ${accountName}`}
        style={{
          backgroundColor: theme.formInputBackground,
          border: `1px solid ${theme.formInputBorder}`,
          fontSize: 15,
          flex: 1,
          height: 32,
          marginLeft: 4,
          padding: 8,
        }}
      />
    </View>
  );
}

const LEFT_RIGHT_FLEX_WIDTH = 80;
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
  onSelectTransaction,
  pushModal,
  onRefresh,
  refreshing,
}) {
  let allTransactions = useMemo(() => {
    return prependTransactions.concat(transactions);
  }, [prependTransactions, transactions]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.tableHeaderBackground,
        overflowY: 'hidden',
        width: '100%',
      }}
    >
      <View
        style={{
          alignItems: 'center',
          flexShrink: 0,
          overflowY: 'hidden',
          paddingTop: 10,
          top: 0,
          width: '100%',
        }}
      >
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <Link
            to={-1}
            style={{
              color: theme.formLabelText,
              alignItems: 'center',
              display: 'flex',
              textDecoration: 'none',
              width: LEFT_RIGHT_FLEX_WIDTH,
            }}
          >
            <CheveronLeft style={{ width: 32, height: 32 }} />
            <Text style={{ ...styles.text, fontWeight: 500 }}>Back</Text>
          </Link>
          <View
            style={{
              fontSize: 16,
              fontWeight: 500,
              position: 'relative',
            }}
            role="heading"
          >
            {account.name}
            {account.bankId && (
              <View
                style={{
                  backgroundColor: theme.noticeText,
                  position: 'absolute',
                  left: '-15px',
                  top: '6px',
                  width: 8,
                  height: 8,
                  borderRadius: 8,
                }}
              />
            )}
          </View>

          <View
            style={{
              flexDirection: 'row',
              width: LEFT_RIGHT_FLEX_WIDTH,
              justifyContent: 'space-around',
              paddingRight: '5px',
            }}
          >
            {account.bankId && (
              <Button onClick={onRefresh}>
                <AnimatedRefresh animating={refreshing} />
              </Button>
            )}
            <ButtonLink
              to="transactions/new"
              type="bare"
              aria-label="Add Transaction"
              style={{
                justifyContent: 'center',
              }}
              hoveredStyle={{ background: 'transparent' }}
              activeStyle={{ background: 'transparent' }}
            >
              <Add width={20} height={20} />
            </ButtonLink>
          </View>
        </View>
        <Label title="BALANCE" style={{ marginTop: 10 }} />
        <CellValue
          binding={balance}
          type="financial"
          debug={true}
          style={{
            fontSize: 18,
            fontWeight: '500',
          }}
          getStyle={value => ({
            color: value < 0 ? theme.errorText : theme.pillTextHighlighted,
          })}
          data-testid="account-balance"
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
        onLoadMore={onLoadMore}
        onSelect={onSelectTransaction}
        pushModal={pushModal}
      />
    </View>
  );
}
