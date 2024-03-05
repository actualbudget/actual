import React, { useState, useMemo } from 'react';

import { useActions } from '../../../hooks/useActions';
import { SvgAdd } from '../../../icons/v1';
import { SvgSearchAlternate } from '../../../icons/v2';
import { theme } from '../../../style';
import { ButtonLink } from '../../common/ButtonLink';
import { InputWithContent } from '../../common/InputWithContent';
import { Label } from '../../common/Label';
import { View } from '../../common/View';
import { MobileBackButton } from '../../MobileBackButton';
import { Page } from '../../Page';
import { CellValue } from '../../spreadsheet/CellValue';
import { useSheetValue } from '../../spreadsheet/useSheetValue';
import { PullToRefresh } from '../PullToRefresh';
import { TransactionList } from '../transactions/TransactionList';

function TransactionSearchInput({ accountName, onSearch }) {
  const [text, setText] = useState('');

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.mobilePageBackground,
        margin: '11px auto 4px',
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
        placeholder={`Search ${accountName}`}
        style={{
          backgroundColor: theme.tableBackground,
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

export function AccountDetails({
  account,
  prependTransactions,
  transactions,
  accounts,
  categories,
  payees,
  balance,
  balanceCleared,
  balanceUncleared,
  isNewTransaction,
  onLoadMore,
  onSearch,
  onSelectTransaction,
  pushModal,
}) {
  const allTransactions = useMemo(() => {
    return prependTransactions.concat(transactions);
  }, [prependTransactions, transactions]);

  const { syncAndDownload } = useActions();
  const onRefresh = async () => {
    await syncAndDownload(account.id);
  };

  return (
    <Page
      title={account.name}
      headerLeftContent={<MobileBackButton />}
      headerRightContent={
        <ButtonLink
          to="transactions/new"
          type="bare"
          aria-label="Add Transaction"
          style={{
            justifyContent: 'center',
            color: theme.mobileHeaderText,
            margin: 10,
          }}
          hoveredStyle={{
            color: theme.mobileHeaderText,
            background: theme.mobileHeaderTextHover,
          }}
          activeStyle={{ background: 'transparent' }}
        >
          <SvgAdd width={20} height={20} />
        </ButtonLink>
      }
      padding={0}
      style={{
        flex: 1,
        backgroundColor: theme.mobilePageBackground,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          flexShrink: 0,
          marginTop: 10,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            boxSizing: 'content-box',
            width: '100%',
            justifyContent: 'space-evenly',
          }}
        >
          <View
            style={{
              visibility:
                useSheetValue(balanceUncleared) === 0 ? 'hidden' : 'visible',
              width: '33%',
            }}
          >
            <Label
              title="CLEARED"
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
              data-testid="account-balance-cleared"
            />
          </View>
          <View style={{ width: '33%' }}>
            <Label title="BALANCE" style={{ textAlign: 'center' }} />
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
              data-testid="account-balance"
            />
          </View>
          <View
            style={{
              visibility:
                useSheetValue(balanceUncleared) === 0 ? 'hidden' : 'visible',
              width: '33%',
            }}
          >
            <Label
              title="UNCLEARED"
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
              data-testid="account-balance-uncleared"
            />
          </View>
        </View>
        <TransactionSearchInput
          accountName={account.name}
          onSearch={onSearch}
        />
      </View>
      <PullToRefresh onRefresh={onRefresh}>
        <TransactionList
          account={account}
          transactions={allTransactions}
          categories={categories}
          accounts={accounts}
          payees={payees}
          isNew={isNewTransaction}
          onLoadMore={onLoadMore}
          onSelect={onSelectTransaction}
          pushModal={pushModal}
        />
      </PullToRefresh>
    </Page>
  );
}
