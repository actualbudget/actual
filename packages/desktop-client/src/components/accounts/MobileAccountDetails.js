import React, { useState, useMemo } from 'react';

import { useActions } from '../../hooks/useActions';
import Add from '../../icons/v1/Add';
import SearchAlternate from '../../icons/v2/SearchAlternate';
import { theme } from '../../style';
import ButtonLink from '../common/ButtonLink';
import InputWithContent from '../common/InputWithContent';
import Label from '../common/Label';
import View from '../common/View';
import MobileBackButton from '../MobileBackButton';
import { Page } from '../Page';
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
        backgroundColor: theme.mobilePageBackground,
        margin: '11px auto 4px',
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
          <Add width={20} height={20} />
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
        <Label title="BALANCE" />
        <CellValue
          binding={balance}
          type="financial"
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
    </Page>
  );
}
