import React, { useState } from 'react';

import { t } from 'i18next';

import { SelectedProvider, useSelected } from '../../../hooks/useSelected';
import { SvgSearchAlternate } from '../../../icons/v2';
import { styles, theme } from '../../../style';
import { InputWithContent } from '../../common/InputWithContent';
import { Label } from '../../common/Label';
import { View } from '../../common/View';
import { CellValue, CellValueText } from '../../spreadsheet/CellValue';
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
  isLoading,
  transactions,
  balance,
  balanceCleared,
  balanceUncleared,
  searchPlaceholder = 'Search...',
  onSearch,
  onLoadMore,
  onOpenTransaction,
  onRefresh,
}) {
  const selectedInst = useSelected('transactions', transactions);

  return (
    <SelectedProvider instance={selectedInst}>
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
          {balanceCleared && balanceUncleared ? (
            <BalanceWithCleared
              balance={balance}
              balanceCleared={balanceCleared}
              balanceUncleared={balanceUncleared}
            />
          ) : (
            <Balance balance={balance} />
          )}
        </View>
        <TransactionSearchInput
          placeholder={searchPlaceholder}
          onSearch={onSearch}
        />
      </View>
      <PullToRefresh isPullable={!!onRefresh} onRefresh={onRefresh}>
        <TransactionList
          isLoading={isLoading}
          transactions={transactions}
          onLoadMore={onLoadMore}
          onOpenTransaction={onOpenTransaction}
        />
      </PullToRefresh>
    </SelectedProvider>
  );
}

function BalanceWithCleared({ balanceUncleared, balanceCleared, balance }) {
  const unclearedAmount = useSheetValue(balanceUncleared);

  return (
    <>
      <View
        style={{
          display: !unclearedAmount ? 'none' : undefined,
          flexBasis: '33%',
        }}
      >
        <Label
          title={t('Cleared')}
          style={{ textAlign: 'center', fontSize: 12 }}
        />
        <CellValue binding={balanceCleared} type="financial">
          {props => (
            <CellValueText
              {...props}
              style={{
                fontSize: 12,
                textAlign: 'center',
                fontWeight: '500',
              }}
              data-testid="transactions-balance-cleared"
            />
          )}
        </CellValue>
      </View>
      <Balance balance={balance} />
      <View
        style={{
          display: !unclearedAmount ? 'none' : undefined,
          flexBasis: '33%',
        }}
      >
        <Label
          title={t('Uncleared')}
          style={{ textAlign: 'center', fontSize: 12 }}
        />
        <CellValue binding={balanceUncleared} type="financial">
          {props => (
            <CellValueText
              {...props}
              style={{
                fontSize: 12,
                textAlign: 'center',
                fontWeight: '500',
              }}
              data-testid="transactions-balance-uncleared"
            />
          )}
        </CellValue>
      </View>
    </>
  );
}

function Balance({ balance }) {
  return (
    <View style={{ flexBasis: '33%' }}>
      <Label title={t('Balance')} style={{ textAlign: 'center' }} />
      <CellValue binding={balance} type="financial">
        {props => (
          <CellValueText
            {...props}
            style={{
              fontSize: 18,
              textAlign: 'center',
              fontWeight: '500',
              color:
                props.value < 0 ? theme.errorText : theme.pillTextHighlighted,
            }}
            data-testid="transactions-balance"
          />
        )}
      </CellValue>
    </View>
  );
}
