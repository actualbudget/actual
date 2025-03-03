import React, { type ComponentProps, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Label } from '@actual-app/components/label';
import { styles } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';

import { type TransactionEntity } from 'loot-core/types/models/transaction';

import { SelectedProvider, useSelected } from '../../../hooks/useSelected';
import { SvgSearchAlternate } from '../../../icons/v2';
import { theme } from '../../../style';
import { InputWithContent } from '../../common/InputWithContent';
import type { Binding, SheetNames, SheetFields } from '../../spreadsheet';
import { CellValue, CellValueText } from '../../spreadsheet/CellValue';
import { useSheetValue } from '../../spreadsheet/useSheetValue';
import { PullToRefresh } from '../PullToRefresh';

import { TransactionList } from './TransactionList';
import {type AccountEntity} from 'loot-core/types/models';

type TransactionSearchInputProps = {
  placeholder: string;
  onSearch: TransactionListWithBalancesProps['onSearch'];
};

function TransactionSearchInput({
  placeholder,
  onSearch,
}: TransactionSearchInputProps) {
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

type TransactionListWithBalancesProps = {
  isLoading: boolean;
  transactions: readonly TransactionEntity[];
  balance:
    | Binding<'account', 'onbudget-accounts-balance'>
    | Binding<'account', 'offbudget-accounts-balance'>
    | Binding<SheetNames, 'uncategorized-balance'>
    | Binding<'category', 'balance'>
    | Binding<'account', 'balance'>
    | Binding<'account', 'accounts-balance'>;
  balanceCleared?:
    | Binding<'category', 'balanceCleared'>
    | Binding<'account', 'balanceCleared'>;
  balanceUncleared?:
    | Binding<'category', 'balanceUncleared'>
    | Binding<'account', 'balanceUncleared'>;
  searchPlaceholder: string;
  onSearch: (searchText: string) => void;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onOpenTransaction: (transaction: TransactionEntity) => void;
  onRefresh?: () => void;
  account: AccountEntity;
};

export function TransactionListWithBalances({
  isLoading,
  transactions,
  balance,
  balanceCleared,
  balanceUncleared,
  searchPlaceholder = 'Search...',
  onSearch,
  isLoadingMore,
  onLoadMore,
  onOpenTransaction,
  onRefresh,
  account,
}: TransactionListWithBalancesProps) {
  const selectedInst = useSelected('transactions', [...transactions], []);

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
        <PullToRefresh
          isPullable={!!onRefresh}
          onRefresh={async () => onRefresh?.()}
        >
          <TransactionList
            isLoading={isLoading}
            transactions={transactions}
            isLoadingMore={isLoadingMore}
            onLoadMore={onLoadMore}
            onOpenTransaction={onOpenTransaction}
            account={account}
          />
        </PullToRefresh>
      </>
    </SelectedProvider>
  );
}

const TransactionListBalanceCellValue = <
  FieldName extends SheetFields<'account'> | SheetFields<'category'>,
>(
  props: ComponentProps<
    typeof CellValue<
      FieldName extends SheetFields<'account'> ? 'account' : 'category',
      FieldName
    >
  >,
) => {
  return <CellValue {...props} />;
};

type BalanceWithClearedProps = {
  balanceUncleared: NonNullable<
    TransactionListWithBalancesProps['balanceUncleared']
  >;
  balanceCleared: NonNullable<
    TransactionListWithBalancesProps['balanceCleared']
  >;
  balance: TransactionListWithBalancesProps['balance'];
};

function BalanceWithCleared({
  balanceUncleared,
  balanceCleared,
  balance,
}: BalanceWithClearedProps) {
  const { t } = useTranslation();
  const unclearedAmount = useSheetValue<
    'account' | 'category',
    'balanceUncleared'
  >(balanceUncleared);

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
        <TransactionListBalanceCellValue
          binding={balanceCleared}
          type="financial"
        >
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
        </TransactionListBalanceCellValue>
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
        <TransactionListBalanceCellValue
          binding={balanceUncleared}
          type="financial"
        >
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
        </TransactionListBalanceCellValue>
      </View>
    </>
  );
}

type BalanceProps = {
  balance: TransactionListWithBalancesProps['balance'];
};

function Balance({ balance }: BalanceProps) {
  const { t } = useTranslation();
  return (
    <View style={{ flexBasis: '33%' }}>
      <Label title={t('Balance')} style={{ textAlign: 'center' }} />
      <TransactionListBalanceCellValue binding={balance} type="financial">
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
      </TransactionListBalanceCellValue>
    </View>
  );
}
