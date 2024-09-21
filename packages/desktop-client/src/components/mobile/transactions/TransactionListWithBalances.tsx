import React, { useState } from 'react';
import { useSelector } from 'react-redux';

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
import { Button } from '../../common/Button2';

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
  reconcileAmount,
  onDoneReconciling,
  onCreateReconciliationTransaction,
}) {
  const newTransactions = useSelector(state => state.queries.newTransactions);

  const isNewTransaction = id => {
    return newTransactions.includes(id);
  };

  const clearedAmount = useSheetValue(balanceCleared);
  const unclearedAmount = useSheetValue(balanceUncleared);
  const selectedInst = useSelected('transactions', transactions, []);
  const reconcileDifference = reconcileAmount - clearedAmount;

  return (
    <SelectedProvider instance={selectedInst}>
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
              <CellValue binding={balanceCleared} type="financial">
                {props => (
                  <CellValueText
                    {...props}
                    style={{
                      fontSize: 12,
                      textAlign: 'center',
                      fontWeight: '500',
                    }}
                  />
                )}
              </CellValue>
            </View>
            <View style={{ flexBasis: '33%' }}>
              <Label title="Balance" style={{ textAlign: 'center' }} />
              <CellValue binding={balance} type="financial">
                {props => (
                  <CellValueText
                    {...props}
                    style={{
                      fontSize: 18,
                      textAlign: 'center',
                      fontWeight: '500',
                      color:
                        props.value < 0
                          ? theme.errorText
                          : theme.pillTextHighlighted,
                    }}
                    data-testid="transactions-balance"
                  />
                )}
              </CellValue>
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
          </View>
          {reconcileAmount !== null && (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-evenly',
                }}
              >
                <View style={{ flexBasis: '33%' }}>
                  <Label title="Bank Balance" style={{ textAlign: 'center' }} />
                  <CellValueText
                    name="bank-balance"
                    type="financial"
                    value={reconcileAmount}
                    style={{
                      fontSize: 18,
                      textAlign: 'center',
                      fontWeight: '500',
                      color: theme.pillTextHighlighted,
                    }}
                    data-testid="transactions-reconcile-difference"
                  />
                </View>
                <View style={{ flexBasis: '33%' }}>
                  <Label title="Difference" style={{ textAlign: 'center' }} />
                  <CellValueText
                    name="reconcile-difference"
                    type="financial-with-sign"
                    value={reconcileDifference}
                    style={{
                      fontSize: 18,
                      textAlign: 'center',
                      fontWeight: '500',
                      color:
                        reconcileDifference != 0
                          ? theme.errorText
                          : theme.pillTextHighlighted,
                    }}
                    data-testid="transactions-reconcile-difference"
                  />
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-evenly',
                }}
              >
                <View style={{ flexBasis: '100%' }}>
                  <Button
                    variant="primary"
                    style={{
                      ...styles.mediumText,
                      height: styles.mobileMinHeight,
                      marginLeft: styles.mobileEditingPadding,
                      marginRight: styles.mobileEditingPadding,
                      marginTop: styles.mobileEditingPadding,
                    }}
                    onPress={
                      reconcileDifference === 0
                        ? onDoneReconciling
                        : () =>
                            onCreateReconciliationTransaction(
                              reconcileDifference,
                            )
                    }
                  >
                    {reconcileDifference === 0
                      ? 'Reconcile'
                      : 'Create Reconciliation Transaction'}
                  </Button>
                </View>
              </View>
            </>
          )}
          <TransactionSearchInput
            placeholder={searchPlaceholder}
            onSearch={onSearch}
          />
        </View>
        <PullToRefresh isPullable={!!onRefresh} onRefresh={onRefresh}>
          <TransactionList
            isLoading={isLoading}
            transactions={transactions}
            isNewTransaction={isNewTransaction}
            onLoadMore={onLoadMore}
            onOpenTransaction={onOpenTransaction}
          />
        </PullToRefresh>
      </>
    </SelectedProvider>
  );
}
