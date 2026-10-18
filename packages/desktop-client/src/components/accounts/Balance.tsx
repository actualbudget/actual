import React, { useRef } from 'react';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgArrowButtonRight1 } from '@actual-app/components/icons/v2';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { q } from '@actual-app/core/shared/query';
import type { Query } from '@actual-app/core/shared/query';
import { getScheduledAmount } from '@actual-app/core/shared/schedules';
import { isPreviewId } from '@actual-app/core/shared/transactions';
import type { IntegerAmount } from '@actual-app/core/shared/util';
import type {
  AccountEntity,
  ScheduleEntity,
} from '@actual-app/core/types/models';
import { useQuery as useReactQuery } from '@tanstack/react-query';
import { useHover } from 'usehooks-ts';

import { accountQueries } from '#accounts';
import { useApproximateTotal } from '#components/currency/ConvertedCellValue';
import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { CellValue, CellValueText } from '#components/spreadsheet/CellValue';
import { useCachedSchedules } from '#hooks/useCachedSchedules';
import { useConvertedQueryTotal } from '#hooks/useConvertedQueryTotal';
import { useCurrencyFormatter } from '#hooks/useCurrencyFormatter';
import { useFormat } from '#hooks/useFormat';
import { useSelectedItems } from '#hooks/useSelected';
import { useSheetValue } from '#hooks/useSheetValue';
import type { Binding } from '#spreadsheet';

type DetailedBalanceProps = {
  name: string;
  balance: number;
  isExactBalance?: boolean;
  account?: AccountEntity;
};

function DetailedBalance({
  name,
  balance,
  isExactBalance = true,
  account,
}: DetailedBalanceProps) {
  const format = useFormat();
  const { formatAccountAmount } = useCurrencyFormatter();
  return (
    <Text
      style={{
        borderRadius: 4,
        padding: '4px 6px',
        color: theme.pillText,
        backgroundColor: theme.pillBackground,
      }}
    >
      {name}{' '}
      <PrivacyFilter>
        <FinancialText style={{ fontWeight: 600 }}>
          {!isExactBalance && '~ '}
          {account
            ? formatAccountAmount(balance, account)
            : format(balance, 'financial')}
        </FinancialText>
      </PrivacyFilter>
    </Text>
  );
}

type SelectedBalanceProps = {
  selectedItems: Set<string>;
  account?: AccountEntity;
};

export function SelectedBalance({
  selectedItems,
  account,
}: SelectedBalanceProps) {
  const { t } = useTranslation();
  const {
    isEnabled,
    defaultCurrencyCode,
    getAccountCurrency,
    convertToDefault,
  } = useCurrencyFormatter();
  // Only needed to convert previews of accounts in other currencies
  const { data: accounts = [] } = useReactQuery({
    ...accountQueries.list(),
    enabled: isEnabled,
  });

  const name = `selected-balance-${[...selectedItems].join('-')}`;

  const rows = useSheetValue<'balance', `selected-transactions-${string}`>({
    name: name as `selected-transactions-${string}`,
    query: q('transactions')
      .filter({
        id: { $oneof: [...selectedItems] },
        parent_id: { $oneof: [...selectedItems] },
      })
      .select('id'),
  });
  const ids = new Set((rows || []).map((r: { id: string }) => r.id));

  const finalIds = [...selectedItems].filter(id => !ids.has(id));
  const sheetBalance = useSheetValue<'balance', `selected-balance-${string}`>({
    name: (name + '-sum') as `selected-balance-${string}`,
    query: q('transactions')
      .filter({ id: { $oneof: finalIds } })
      .options({ splits: 'all' })
      .calculate({ $sum: '$amount' }),
  });
  // Across accounts, amounts in other currencies are converted first
  const convertedBalance = useConvertedQueryTotal(
    account ? null : q('transactions').filter({ id: { $oneof: finalIds } }),
    { splits: 'all' },
  );
  let balance = convertedBalance ? convertedBalance.total : sheetBalance;

  const { isLoading, schedules = [] } = useCachedSchedules();

  if (isLoading || convertedBalance?.total === null) {
    return null;
  }

  const previews = getSchedulePreviewsBalance({
    selectedIds: selectedItems,
    schedules,
    account,
    // A converted balance needs the previews converted the same way, from
    // the currency of each schedule's account
    convert: convertedBalance
      ? (amount, accountId) => {
          const scheduleAccount = accounts.find(({ id }) => id === accountId);
          const conversion = convertToDefault(
            amount,
            scheduleAccount
              ? getAccountCurrency(scheduleAccount)
              : defaultCurrencyCode,
          );
          return {
            amount: conversion.amount,
            isExact: conversion.lookup !== null,
          };
        }
      : undefined,
  });
  const scheduleBalance = previews.balance;
  // Accounts counted 1:1 for lack of a rate make the balance approximate
  const isExactBalance =
    previews.isExact && (convertedBalance?.withoutRate.length ?? 0) === 0;

  if (typeof balance !== 'number' && !scheduleBalance) {
    return null;
  } else {
    balance = (balance ?? 0) + scheduleBalance;
  }

  return (
    <DetailedBalance
      name={t('Selected balance:')}
      balance={balance}
      isExactBalance={isExactBalance}
      account={account}
    />
  );
}

type SchedulePreviewsBalanceOptions = {
  selectedIds: Iterable<string>;
  schedules: readonly ScheduleEntity[];
  // The account being viewed, if only one
  account?: AccountEntity;
  // Values an amount of `accountId` in the currency of the balance
  convert?: (
    amount: IntegerAmount,
    accountId: string,
  ) => { amount: IntegerAmount; isExact: boolean };
};

// The total of the selected schedule previews, and whether it is exact
export function getSchedulePreviewsBalance({
  selectedIds,
  schedules,
  account,
  convert,
}: SchedulePreviewsBalanceOptions): {
  balance: IntegerAmount;
  isExact: boolean;
} {
  let balance = 0;
  let isExact = true;

  for (const id of [...selectedIds].filter(isPreviewId)) {
    // Preview IDs are in the format `preview/<schedule_id>/<date>`
    const scheduleId = id.slice(8).split('/')[0];
    const schedule = schedules.find(s => s.id === scheduleId);
    if (schedule) {
      // If a schedule is `between X and Y` then we calculate the average
      if (schedule._amountOp === 'isbetween') {
        isExact = false;
      }

      const amount = getScheduledAmount(schedule._amount);
      if (!account || account.id === schedule._account) {
        if (convert) {
          const converted = convert(amount, schedule._account);
          balance += converted.amount;
          isExact = isExact && converted.isExact;
        } else {
          balance += amount;
        }
      } else {
        balance -= amount;
      }
    }
  }

  return { balance, isExact };
}

type FilteredBalanceProps = {
  filteredAmount?: number | null;
  filteredQuery?: Query | null;
  account?: AccountEntity;
};

function FilteredBalance({
  filteredAmount,
  filteredQuery,
  account,
}: FilteredBalanceProps) {
  const { t } = useTranslation();
  // Across accounts, amounts in other currencies are converted first
  const convertedAmount = useConvertedQueryTotal(
    account ? null : (filteredQuery ?? null),
  );

  if (convertedAmount?.total === null) {
    return null;
  }

  return (
    <DetailedBalance
      name={t('Filtered balance:')}
      balance={convertedAmount ? convertedAmount.total : (filteredAmount ?? 0)}
      isExactBalance={(convertedAmount?.withoutRate.length ?? 0) === 0}
      account={account}
    />
  );
}

type MoreBalancesProps = {
  balanceQuery: { name: `balance-query-${string}`; query: Query };
  account?: AccountEntity;
};

function MoreBalances({ balanceQuery, account }: MoreBalancesProps) {
  const { t } = useTranslation();

  const cleared = useSheetValue<'balance', `balance-query-${string}-cleared`>({
    name: (balanceQuery.name + '-cleared') as `balance-query-${string}-cleared`,
    query: balanceQuery.query.filter({ cleared: true }),
  });
  const uncleared = useSheetValue<
    'balance',
    `balance-query-${string}-uncleared`
  >({
    name: (balanceQuery.name +
      '-uncleared') as `balance-query-${string}-uncleared`,
    query: balanceQuery.query.filter({ cleared: false }),
  });
  // Across accounts, amounts in other currencies are converted first
  const convertedCleared = useConvertedQueryTotal(
    account ? null : balanceQuery.query.filter({ cleared: true }),
  );
  const convertedUncleared = useConvertedQueryTotal(
    account ? null : balanceQuery.query.filter({ cleared: false }),
  );

  if (convertedCleared?.total === null || convertedUncleared?.total === null) {
    return null;
  }

  return (
    <>
      <DetailedBalance
        name={t('Cleared total:')}
        balance={convertedCleared ? convertedCleared.total : (cleared ?? 0)}
        isExactBalance={(convertedCleared?.withoutRate.length ?? 0) === 0}
        account={account}
      />
      <DetailedBalance
        name={t('Uncleared total:')}
        balance={
          convertedUncleared ? convertedUncleared.total : (uncleared ?? 0)
        }
        isExactBalance={(convertedUncleared?.withoutRate.length ?? 0) === 0}
        account={account}
      />
    </>
  );
}

type BalancesProps = {
  balanceQuery: { name: `balance-query-${string}`; query: Query };
  showExtraBalances: boolean;
  onToggleExtraBalances: () => void;
  account?: AccountEntity;
  isFiltered: boolean;
  filteredAmount?: number | null;
  filteredQuery?: Query | null;
};

export function Balances({
  balanceQuery,
  showExtraBalances,
  onToggleExtraBalances,
  account,
  isFiltered,
  filteredAmount,
  filteredQuery,
}: BalancesProps) {
  const selectedItems = useSelectedItems();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { formatAccountAmount } = useCurrencyFormatter();
  // Views across accounts add up accounts in other currencies converted
  const convertedTotal = useConvertedQueryTotal(
    account ? null : balanceQuery.query,
  );
  const approximate = useApproximateTotal(convertedTotal?.withoutRate ?? []);
  const getBalanceStyle = (value: number) => ({
    fontSize: 22,
    fontWeight: 400,
    color:
      value < 0
        ? theme.numberNegative
        : value > 0
          ? theme.numberPositive
          : theme.pageTextSubdued,
  });
  const isButtonHovered = useHover(buttonRef as RefObject<HTMLButtonElement>);

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginTop: -5,
        marginLeft: -5,
        gap: 10,
      }}
    >
      <Button
        ref={buttonRef}
        data-testid="account-balance"
        variant="bare"
        onPress={onToggleExtraBalances}
        style={{
          paddingTop: 1,
          paddingBottom: 1,
        }}
      >
        {convertedTotal !== null ? (
          <CellValueText<'balance', `balance-query-${string}`>
            type="financial"
            name={balanceQuery.name}
            // 0 while loading, as the regular balance starts
            value={convertedTotal.total ?? 0}
            formatter={approximate.formatter}
            title={approximate.title}
            style={getBalanceStyle(convertedTotal.total ?? 0)}
          />
        ) : (
          <CellValue
            binding={
              { ...balanceQuery, value: 0 } as Binding<
                'balance',
                `balance-query-${string}`
              >
            }
            type="financial"
          >
            {props => (
              <CellValueText
                {...props}
                formatter={
                  account
                    ? value => formatAccountAmount(value ?? 0, account)
                    : undefined
                }
                style={getBalanceStyle(props.value)}
              />
            )}
          </CellValue>
        )}

        <SvgArrowButtonRight1
          style={{
            width: 10,
            height: 10,
            marginLeft: 10,
            color: theme.pillText,
            transform: showExtraBalances ? 'rotateZ(180deg)' : 'rotateZ(0)',
            opacity:
              isButtonHovered || selectedItems.size > 0 || showExtraBalances
                ? 1
                : 0,
          }}
        />
      </Button>

      {showExtraBalances && (
        <MoreBalances balanceQuery={balanceQuery} account={account} />
      )}

      {selectedItems.size > 0 && (
        <SelectedBalance selectedItems={selectedItems} account={account} />
      )}
      {isFiltered && (
        <FilteredBalance
          filteredAmount={filteredAmount}
          filteredQuery={filteredQuery}
          account={account}
        />
      )}
    </View>
  );
}
