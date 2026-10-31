import React, { useState } from 'react';
import type { ComponentProps } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { SvgFilter } from '@actual-app/components/icons/v1';
import { Label } from '@actual-app/components/label';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { IntegerAmount } from '@actual-app/core/shared/util';
import type {
  AccountEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import { Search } from '#components/common/Search';
import { ConvertedCellValue } from '#components/currency/ConvertedCellValue';
import { PullToRefresh } from '#components/mobile/PullToRefresh';
import { CellValue, CellValueText } from '#components/spreadsheet/CellValue';
import { DisplayPayeeProvider } from '#hooks/useDisplayPayee';
import type { FormatType } from '#hooks/useFormat';
import { SelectedProvider, useSelected } from '#hooks/useSelected';
import { useSheetValue } from '#hooks/useSheetValue';
import type { Binding, SheetFields, SheetNames } from '#spreadsheet';

import { TransactionList } from './TransactionList';

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
      <Search
        value={text}
        onChange={text => {
          setText(text);
          onSearch(text);
        }}
        placeholder={placeholder}
        width="100%"
        height={styles.mobileMinHeight}
        style={{
          backgroundColor: theme.tableBackground,
          borderColor: theme.formInputBorder,
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
    | Binding<'account', 'closed-accounts-balance'>
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
  showRunningBalances?: boolean;
  runningBalances?: Map<TransactionEntity['id'], IntegerAmount>;
  searchPlaceholder: string;
  onSearch: (searchText: string) => void;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onOpenTransaction: (transaction: TransactionEntity) => void;
  onRefresh?: () => void;
  showMakeTransfer?: boolean;
  isReconciling?: boolean;
  onToggleTransactionCleared?: (transaction: TransactionEntity) => void;
  filtered?: boolean;
  // Formats the balances, e.g. in the currency of the account
  balanceFormatter?: (value: number) => string;
  // For totals: the accounts that `balance` adds up, so balances in other
  // currencies can be converted first
  balanceAccounts?: AccountEntity[];
};

export function TransactionListWithBalances({
  isLoading,
  transactions,
  balance,
  balanceCleared,
  balanceUncleared,
  showRunningBalances,
  runningBalances,
  searchPlaceholder = 'Search...',
  onSearch,
  isLoadingMore,
  onLoadMore,
  onOpenTransaction,
  onRefresh,
  showMakeTransfer = false,
  isReconciling = false,
  onToggleTransactionCleared,
  filtered = false,
  balanceFormatter,
  balanceAccounts,
}: TransactionListWithBalancesProps) {
  const selectedInst = useSelected('transactions', [...transactions], []);

  return (
    <DisplayPayeeProvider transactions={transactions}>
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
                alwaysShowCleared={isReconciling}
                formatter={balanceFormatter}
              />
            ) : (
              <>
                <View style={{ flexBasis: '33%' }} />
                <Balance
                  balance={balance}
                  formatter={balanceFormatter}
                  accounts={balanceAccounts}
                />
                <View
                  style={{
                    flexBasis: '33%',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {filtered && <AppliedFiltersChip />}
                </View>
              </>
            )}
          </View>
          <TransactionSearchInput
            placeholder={searchPlaceholder}
            onSearch={onSearch}
          />
        </View>
        <PullToRefresh
          isPullable={!isLoading && !!onRefresh}
          onRefresh={async () => onRefresh?.()}
          style={{
            '& .ptr__children': {
              display: 'flex',
            },
          }}
        >
          <TransactionList
            isLoading={isLoading}
            transactions={transactions}
            showRunningBalances={showRunningBalances}
            runningBalances={runningBalances}
            isLoadingMore={isLoadingMore}
            onLoadMore={onLoadMore}
            onOpenTransaction={onOpenTransaction}
            showMakeTransfer={showMakeTransfer}
            isReconciling={isReconciling}
            onToggleTransactionCleared={onToggleTransactionCleared}
          />
        </PullToRefresh>
      </SelectedProvider>
    </DisplayPayeeProvider>
  );
}

function AppliedFiltersChip() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.pillBackgroundSelected,
        color: theme.pillTextSelected,
        borderRadius: 15,
        padding: '4px 10px',
      }}
    >
      <SvgFilter width={12} height={12} style={{ flexShrink: 0 }} />
      <Text size="small" style={{ fontWeight: 500 }}>
        <Trans>Filters applied</Trans>
      </Text>
    </View>
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

// Three balances share the width of a phone; an amount shown with its
// converted value, e.g. "USD$1,774.45 (2,520.17)", goes on two lines
// rather than running into its neighbours
const balanceColumnStyle = { flexBasis: '33%', minWidth: 0 };
const wrappingAmountStyle = { whiteSpace: 'normal' } as const;

type BalanceWithClearedProps = {
  balanceUncleared: NonNullable<
    TransactionListWithBalancesProps['balanceUncleared']
  >;
  balanceCleared: NonNullable<
    TransactionListWithBalancesProps['balanceCleared']
  >;
  balance: TransactionListWithBalancesProps['balance'];
  alwaysShowCleared?: boolean;
  formatter?: (value: number) => string;
};

function BalanceWithCleared({
  balanceUncleared,
  balanceCleared,
  balance,
  alwaysShowCleared = false,
  formatter,
}: BalanceWithClearedProps) {
  const { t } = useTranslation();
  const unclearedAmount = useSheetValue<
    'account' | 'category',
    'balanceUncleared'
  >(balanceUncleared);
  const showCleared = !!unclearedAmount || alwaysShowCleared;

  return (
    <>
      <View
        style={{
          ...balanceColumnStyle,
          display: !showCleared ? 'none' : undefined,
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
              formatter={formatter}
              style={{
                ...wrappingAmountStyle,
                fontSize: 12,
                textAlign: 'center',
                fontWeight: '500',
              }}
              data-testid="transactions-balance-cleared"
            />
          )}
        </TransactionListBalanceCellValue>
      </View>
      <Balance balance={balance} formatter={formatter} />
      <View
        style={{
          ...balanceColumnStyle,
          display: !showCleared ? 'none' : undefined,
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
              formatter={formatter}
              style={{
                ...wrappingAmountStyle,
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
  formatter?: (value: number) => string;
  accounts?: AccountEntity[];
};

function Balance({ balance, formatter, accounts }: BalanceProps) {
  const { t } = useTranslation();
  const renderBalance = ({
    value,
    ...props
  }: {
    type?: FormatType;
    name: string;
    value: number;
    formatter?: (value: number, type?: FormatType) => string;
    title?: string;
  }) => (
    <CellValueText
      {...props}
      value={value}
      formatter={formatter ?? props.formatter}
      style={{
        ...wrappingAmountStyle,
        fontSize: 18,
        textAlign: 'center',
        fontWeight: '500',
        color:
          value < 0
            ? theme.numberNegative
            : value > 0
              ? theme.numberPositive
              : theme.numberNeutral,
      }}
      data-testid="transactions-balance"
    />
  );

  return (
    <View style={balanceColumnStyle}>
      <Label title={t('Balance')} style={{ textAlign: 'center' }} />
      {accounts ? (
        <ConvertedCellValue
          // Totals across accounts are always account sheet cells
          binding={balance as Binding<'account', SheetFields<'account'>>}
          accounts={accounts}
          type="financial"
        >
          {props =>
            renderBalance({
              ...props,
              value: Number(props.value),
              formatter: props.formatter
                ? (value, type) => props.formatter?.(value, type) ?? ''
                : undefined,
            })
          }
        </ConvertedCellValue>
      ) : (
        <TransactionListBalanceCellValue binding={balance} type="financial">
          {renderBalance}
        </TransactionListBalanceCellValue>
      )}
    </View>
  );
}
