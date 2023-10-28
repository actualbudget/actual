import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

import { useActions } from '../../hooks/useActions';
import Add from '../../icons/v1/Add';
import CheveronLeft from '../../icons/v1/CheveronLeft';
import SearchAlternate from '../../icons/v2/SearchAlternate';
import { theme, styles } from '../../style';
import ButtonLink from '../common/ButtonLink';
import InputWithContent from '../common/InputWithContent';
import Label from '../common/Label';
import Text from '../common/Text';
import View from '../common/View';
import PullToRefresh from '../responsive/PullToRefresh';
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
  onSelectTransaction,
  pushModal,
}) {
  let allTransactions = useMemo(() => {
    return prependTransactions.concat(transactions);
  }, [prependTransactions, transactions]);

  const { syncAndDownload } = useActions();
  const onRefresh = async () => {
    await syncAndDownload(account.id);
  };

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
            }}
            role="heading"
          >
            {account.name}
          </View>

          <ButtonLink
            to="transactions/new"
            type="bare"
            aria-label="Add Transaction"
            style={{ justifyContent: 'center', width: LEFT_RIGHT_FLEX_WIDTH }}
            hoveredStyle={{ background: 'transparent' }}
            activeStyle={{ background: 'transparent' }}
          >
            <Add width={20} height={20} />
          </ButtonLink>
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

      <PullToRefresh onRefresh={onRefresh}>
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
      </PullToRefresh>
    </View>
  );
}
