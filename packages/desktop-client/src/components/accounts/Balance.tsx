import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { css } from '@emotion/css';

import { isPreviewId } from 'loot-core/shared/transactions';
import { useCachedSchedules } from 'loot-core/src/client/data-hooks/schedules';
import { q, type Query } from 'loot-core/src/shared/query';
import { getScheduledAmount } from 'loot-core/src/shared/schedules';
import { type AccountEntity } from 'loot-core/types/models';

import { useSelectedItems } from '../../hooks/useSelected';
import { SvgArrowButtonRight1 } from '../../icons/v2';
import { theme } from '../../style';
import { ButtonWithLoading } from '../common/Button2';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { PrivacyFilter } from '../PrivacyFilter';
import { type Binding } from '../spreadsheet';
import { CellValue, CellValueText } from '../spreadsheet/CellValue';
import { useFormat } from '../spreadsheet/useFormat';
import { useSheetValue } from '../spreadsheet/useSheetValue';

type DetailedBalanceProps = {
  name: string;
  balance: number;
  isExactBalance?: boolean;
};

function DetailedBalance({
  name,
  balance,
  isExactBalance = true,
}: DetailedBalanceProps) {
  const format = useFormat();
  return (
    <Text
      style={{
        marginLeft: 15,
        borderRadius: 4,
        padding: '4px 6px',
        color: theme.pillText,
        backgroundColor: theme.pillBackground,
      }}
    >
      {name}{' '}
      <PrivacyFilter>
        <Text style={{ fontWeight: 600 }}>
          {!isExactBalance && '~ '}
          {format(balance, 'financial')}
        </Text>
      </PrivacyFilter>
    </Text>
  );
}

type SelectedBalanceProps = {
  selectedItems: Set<string>;
  accountId?: AccountEntity['id'];
};

function SelectedBalance({ selectedItems, accountId }: SelectedBalanceProps) {
  const { t } = useTranslation();

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
  let balance = useSheetValue<'balance', `selected-balance-${string}`>({
    name: (name + '-sum') as `selected-balance-${string}`,
    query: q('transactions')
      .filter({ id: { $oneof: finalIds } })
      .options({ splits: 'all' })
      .calculate({ $sum: '$amount' }),
  });

  let scheduleBalance = 0;

  const { isLoading, schedules = [] } = useCachedSchedules();

  if (isLoading) {
    return null;
  }

  const previewIds = [...selectedItems]
    .filter(id => isPreviewId(id))
    .map(id => id.slice(8));
  let isExactBalance = true;

  for (const s of schedules) {
    if (previewIds.includes(s.id)) {
      // If a schedule is `between X and Y` then we calculate the average
      if (s._amountOp === 'isbetween') {
        isExactBalance = false;
      }

      if (accountId !== s._account) {
        scheduleBalance += getScheduledAmount(s._amount);
      } else {
        scheduleBalance -= getScheduledAmount(s._amount);
      }
    }
  }

  if (!balance && !scheduleBalance) {
    return null;
  } else {
    balance = (balance ?? 0) + scheduleBalance;
  }

  return (
    <DetailedBalance
      name={t('Selected balance:')}
      balance={balance}
      isExactBalance={isExactBalance}
    />
  );
}

type FilteredBalanceProps = {
  transactionsQuery: Query;
};

function FilteredBalance({ transactionsQuery }: FilteredBalanceProps) {
  const { t } = useTranslation();
  const filteredBalance = useSheetValue<'balance', 'filtered-balance'>({
    name: 'filtered-balance',
    query: transactionsQuery.calculate({ $sum: '$amount' }),
    value: 0,
  });

  return (
    <DetailedBalance
      name={t('Filtered balance:')}
      balance={filteredBalance || 0}
      isExactBalance={true}
    />
  );
}

type MoreBalancesProps = {
  accountId: AccountEntity['id'] | string;
  balanceQuery: Query;
};

function MoreBalances({ accountId, balanceQuery }: MoreBalancesProps) {
  const { t } = useTranslation();

  const clearedQuery = useMemo(
    () => balanceQuery.filter({ cleared: true }),
    [balanceQuery],
  );
  const cleared = useSheetValue<'balance', `balance-query-${string}-cleared`>({
    name: `balance-query-${accountId}-cleared`,
    query: clearedQuery,
  });

  const unclearedQuery = useMemo(
    () => balanceQuery.filter({ cleared: false }),
    [balanceQuery],
  );
  const uncleared = useSheetValue<
    'balance',
    `balance-query-${string}-uncleared`
  >({
    name: `balance-query-${accountId}-uncleared`,
    query: unclearedQuery,
  });

  return (
    <View style={{ flexDirection: 'row' }}>
      <DetailedBalance name={t('Cleared total:')} balance={cleared ?? 0} />
      <DetailedBalance name={t('Uncleared total:')} balance={uncleared ?? 0} />
    </View>
  );
}

type BalancesProps = {
  accountId?: AccountEntity['id'] | string;
  showFilteredBalance: boolean;
  transactionsQuery?: Query;
  balanceQuery: Query;
  showExtraBalances: boolean;
  onToggleExtraBalances: () => void;
};

export function Balances({
  accountId,
  balanceQuery,
  transactionsQuery,
  showFilteredBalance,
  showExtraBalances,
  onToggleExtraBalances,
}: BalancesProps) {
  const selectedItems = useSelectedItems();
  const balanceBinding = useMemo<Binding<'balance', `balance-query-${string}`>>(
    () => ({
      name: `balance-query-${accountId}`,
      query: balanceQuery,
      value: 0,
    }),
    [accountId, balanceQuery],
  );

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -5,
        marginLeft: -5,
      }}
    >
      <ButtonWithLoading
        isLoading={!balanceQuery}
        data-testid="account-balance"
        variant="bare"
        onPress={onToggleExtraBalances}
        className={css({
          paddingTop: 1,
          paddingBottom: 1,
          [`& svg`]: {
            width: 10,
            height: 10,
            marginLeft: 10,
            color: theme.pillText,
            transform: showExtraBalances ? 'rotateZ(180deg)' : 'rotateZ(0)',
            opacity: selectedItems.size > 0 || showExtraBalances ? 1 : 0,
          },
          [`&[data-hovered] svg`]: {
            opacity: 1,
          },
        })}
      >
        <CellValue binding={balanceBinding} type="financial">
          {props => (
            <CellValueText
              {...props}
              style={{
                fontSize: 22,
                fontWeight: 400,
                color:
                  props.value < 0
                    ? theme.errorText
                    : props.value > 0
                      ? theme.noticeTextLight
                      : theme.pageTextSubdued,
              }}
            />
          )}
        </CellValue>

        <SvgArrowButtonRight1 />
      </ButtonWithLoading>
      {showExtraBalances && accountId && balanceQuery && (
        <MoreBalances accountId={accountId} balanceQuery={balanceQuery} />
      )}
      {selectedItems.size > 0 && (
        <SelectedBalance selectedItems={selectedItems} accountId={accountId} />
      )}
      {showFilteredBalance && transactionsQuery && (
        <FilteredBalance transactionsQuery={transactionsQuery} />
      )}
    </View>
  );
}
