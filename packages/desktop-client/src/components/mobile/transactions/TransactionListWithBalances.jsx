import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import { SvgSearchAlternate } from '../../../icons/v2';
import { styles, theme } from '../../../style';
import { InputWithContent } from '../../common/InputWithContent';
import { Label } from '../../common/Label';
import { View } from '../../common/View';
import { CellValue } from '../../spreadsheet/CellValue';
import { useSheetValue } from '../../spreadsheet/useSheetValue';
import { PullToRefresh } from '../PullToRefresh';

import { TransactionList } from './TransactionList';

function TransactionSearchInput({ placeholder, onSearch }) {
  const [text, setText] = useState('');

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.mobilePageBackground,
        padding: 10,
        width: '100%',
      }}
    >
      <InputWithContent
        leftContent={
          <SvgSearchAlternate
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
        onChangeValue={text => {
          setText(text);
          onSearch(text);
        }}
        placeholder={placeholder}
        style={{
          backgroundColor: theme.tableBackground,
          border: `1px solid ${theme.formInputBorder}`,
          flex: 1,
          height: styles.mobileMinHeight,
        }}
      />
    </View>
  );
}

export function TransactionListWithBalances({
  transactions,
  balance,
  balanceCleared,
  balanceUncleared,
  searchPlaceholder = 'Search...',
  onSearch,
  onLoadMore,
  onSelectTransaction,
  onRefresh,
}) {
  const newTransactions = useSelector(state => state.queries.newTransactions);

  const isNewTransaction = id => {
    return newTransactions.includes(id);
  };

  const unclearedAmount = useSheetValue(balanceUncleared);

  return (
    <>
      <View
        style={{
          flexShrink: 0,
          marginTop: 10,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-evenly',
          }}
        >
          <View
            style={{
              display: !unclearedAmount ? 'none' : undefined,
              flexBasis: '33%',
            }}
          >
            <Label
              title="Cleared"
              style={{ textAlign: 'center', fontSize: 12 }}
            />
            <CellValue
              binding={balanceCleared}
              type="financial"
              style={{
                fontSize: 12,
                textAlign: 'center',
                fontWeight: '500',
              }}
              data-testid="transactions-balance-cleared"
            />
          </View>
          <View style={{ flexBasis: '33%' }}>
            <Label title="Balance" style={{ textAlign: 'center' }} />
            <CellValue
              binding={balance}
              type="financial"
              style={{
                fontSize: 18,
                textAlign: 'center',
                fontWeight: '500',
              }}
              getStyle={value => ({
                color: value < 0 ? theme.errorText : theme.pillTextHighlighted,
              })}
              data-testid="transactions-balance"
            />
          </View>
          <View
            style={{
              display: !unclearedAmount ? 'none' : undefined,
              flexBasis: '33%',
            }}
          >
            <Label
              title="Uncleared"
              style={{ textAlign: 'center', fontSize: 12 }}
            />
            <CellValue
              binding={balanceUncleared}
              type="financial"
              style={{
                fontSize: 12,
                textAlign: 'center',
                fontWeight: '500',
              }}
              data-testid="transactions-balance-uncleared"
            />
          </View>
        </View>
        <TransactionSearchInput
          placeholder={searchPlaceholder}
          onSearch={onSearch}
        />
      </View>
      <PullToRefresh isPullable={!!onRefresh} onRefresh={onRefresh}>
        <TransactionList
          transactions={transactions}
          isNew={isNewTransaction}
          onLoadMore={onLoadMore}
          onSelect={onSelectTransaction}
        />
      </PullToRefresh>
    </>
  );
}
