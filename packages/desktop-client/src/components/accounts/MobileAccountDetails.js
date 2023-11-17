import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

import { useActions } from '../../hooks/useActions';
import Add from '../../icons/v1/Add';
import CheveronLeft from '../../icons/v1/CheveronLeft';
import SearchAlternate from '../../icons/v2/SearchAlternate';
import { theme, styles } from '../../style';
import Button from '../common/Button';
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

const LEFT_RIGHT_FLEX_WIDTH = 70;
const BUDGET_HEADER_HEIGHT = 50;

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
        backgroundColor: theme.mobilePageBackground,
        overflowY: 'hidden',
        flexGrow: 1,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          flexShrink: 0,
          overflowY: 'hidden',
          top: 0,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            flexShrink: 0,
            height: BUDGET_HEADER_HEIGHT,
            width: '100%',
            backgroundColor: theme.mobileHeaderBackground,
          }}
        >
          <View
            style={{
              width: LEFT_RIGHT_FLEX_WIDTH,
              flexDirection: 'row',
            }}
          >
            <Button
              type="bare"
              style={{
                color: theme.mobileHeaderText,
                justifyContent: 'center',
                margin: 10,
                paddingLeft: 5,
                paddingRight: 3,
              }}
              hoveredStyle={{
                color: theme.mobileHeaderText,
                background: theme.mobileHeaderTextHover,
              }}
            >
              <Link
                to={-1}
                style={{
                  alignItems: 'center',
                  display: 'flex',
                  textDecoration: 'none',
                }}
              >
                <CheveronLeft
                  style={{ width: 30, height: 30, margin: -10, marginLeft: -5 }}
                />
                <Text
                  style={{
                    ...styles.text,
                    fontWeight: 500,
                    marginLeft: 5,
                    marginRight: 5,
                  }}
                >
                  Back
                </Text>
              </Link>
            </Button>
            <View
              style={{
                flex: 1,
              }}
            />
          </View>
          <View
            style={{
              flex: 1,
              fontSize: 16,
              fontWeight: 500,
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.mobileHeaderText,
            }}
            role="heading"
          >
            {account.name}
          </View>

          <View
            style={{
              width: LEFT_RIGHT_FLEX_WIDTH,
              flexDirection: 'row',
            }}
          >
            <View
              style={{
                flex: 1,
              }}
            />
            <ButtonLink
              to="transactions/new"
              type="bare"
              aria-label="Add Transaction"
              style={{
                justifyContent: 'center',
                padding: 10,
                margin: 10,
                color: theme.mobileHeaderText,
              }}
              hoveredStyle={{
                color: theme.mobileHeaderText,
                background: theme.mobileHeaderTextHover,
              }}
              activeStyle={{ background: 'transparent' }}
            >
              <Add width={20} height={20} style={{ margin: -5 }} />
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
