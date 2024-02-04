import React from 'react';

import { useCachedSchedules } from 'loot-core/src/client/data-hooks/schedules';
import { q, type Query } from 'loot-core/src/shared/query';
import { getScheduledAmount } from 'loot-core/src/shared/schedules';
import type { AccountEntity, TransactionEntity } from 'loot-core/types/models';

import { useSelectedItems } from '../../hooks/useSelected';
import { SvgArrowButtonRight1 } from '../../icons/v2';
import { theme } from '../../style';
import { Button } from '../common/Button';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { PrivacyFilter } from '../PrivacyFilter';
import { CellValue } from '../spreadsheet/CellValue';
import { useFormat } from '../spreadsheet/useFormat';
import { useSheetValue } from '../spreadsheet/useSheetValue';
import { isPreviewId } from '../transactions/TransactionsTable';

type BalanceQuery = {
  name: string;
  query: Query;
};

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
  account: AccountEntity;
};

function SelectedBalance({ selectedItems, account }: SelectedBalanceProps) {
  const name = `selected-balance-${[...selectedItems].join('-')}`;

  const rows = useSheetValue<Pick<TransactionEntity, 'id'>[]>({
    name,
    query: q('transactions')
      .filter({
        id: { $oneof: [...selectedItems] },
        parent_id: { $oneof: [...selectedItems] },
      })
      .select('id'),
  });
  const ids = new Set((rows || []).map(r => r.id));

  const finalIds = [...selectedItems].filter(id => !ids.has(id));
  let balance = useSheetValue<number>({
    name: name + '-sum',
    query: q('transactions')
      .filter({ id: { $oneof: finalIds } })
      .options({ splits: 'all' })
      .calculate({ $sum: '$amount' }),
  });

  let scheduleBalance = null;
  const scheduleData = useCachedSchedules();
  const schedules = scheduleData ? scheduleData.schedules : [];
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

      scheduleBalance ??= 0;
      if (!account || account.id === s._account) {
        scheduleBalance += getScheduledAmount(s._amount);
      } else {
        scheduleBalance -= getScheduledAmount(s._amount);
      }
    }
  }

  if (balance == null) {
    if (scheduleBalance == null) {
      return null;
    } else {
      balance = scheduleBalance;
    }
  } else if (scheduleBalance != null) {
    balance += scheduleBalance;
  }

  return (
    <DetailedBalance
      name="Selected balance:"
      balance={balance}
      isExactBalance={isExactBalance}
    />
  );
}

function MoreBalances({ balanceQuery }: { balanceQuery: BalanceQuery }) {
  const cleared =
    useSheetValue<number>({
      name: balanceQuery.name + '-cleared',
      query: balanceQuery.query.filter({ cleared: true }),
    }) ?? 0;
  const uncleared =
    useSheetValue<number>({
      name: balanceQuery.name + '-uncleared',
      query: balanceQuery.query.filter({ cleared: false }),
    }) ?? 0;

  return (
    <View style={{ flexDirection: 'row' }}>
      <DetailedBalance name="Cleared total:" balance={cleared} />
      <DetailedBalance name="Uncleared total:" balance={uncleared} />
    </View>
  );
}

type BalancesProps = {
  balanceQuery: BalanceQuery;
  showExtraBalances: boolean;
  onToggleExtraBalances: () => void;
  account: AccountEntity;
};

export function Balances({
  balanceQuery,
  showExtraBalances,
  onToggleExtraBalances,
  account,
}: BalancesProps) {
  const selectedItems = useSelectedItems<string>();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -5,
        marginLeft: -5,
      }}
    >
      <Button
        data-testid="account-balance"
        type="bare"
        onClick={onToggleExtraBalances}
        style={{
          '& svg': {
            opacity: selectedItems.size > 0 || showExtraBalances ? 1 : 0,
          },
          '&:hover svg': { opacity: 1 },
        }}
      >
        <CellValue
          binding={{ ...balanceQuery, value: 0 }}
          type="financial"
          style={{ fontSize: 22, fontWeight: 400 }}
          getStyle={value => ({
            color:
              value < 0
                ? theme.errorText
                : value > 0
                  ? theme.noticeTextLight
                  : theme.pageTextSubdued,
          })}
          privacyFilter={{
            blurIntensity: 5,
          }}
        />

        <SvgArrowButtonRight1
          style={{
            width: 10,
            height: 10,
            marginLeft: 10,
            color: theme.pillText,
            transform: showExtraBalances ? 'rotateZ(180deg)' : 'rotateZ(0)',
          }}
        />
      </Button>
      {showExtraBalances && <MoreBalances balanceQuery={balanceQuery} />}

      {selectedItems.size > 0 && (
        <SelectedBalance selectedItems={selectedItems} account={account} />
      )}
    </View>
  );
}
