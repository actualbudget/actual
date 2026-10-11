import React, { useRef } from 'react';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDelete } from '@actual-app/components/icons/v0';
import { SvgArrowButtonRight1 } from '@actual-app/components/icons/v2';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type { Query } from '@actual-app/core/shared/query';
import { getScheduledAmount } from '@actual-app/core/shared/schedules';
import { isPreviewId } from '@actual-app/core/shared/transactions';
import type { AccountEntity } from '@actual-app/core/types/models';
import { useHover } from 'usehooks-ts';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { CellValue, CellValueText } from '#components/spreadsheet/CellValue';
import { useCachedSchedules } from '#hooks/useCachedSchedules';
import { useDateFormat } from '#hooks/useDateFormat';
import { useFormat } from '#hooks/useFormat';
import { useSelectedItems } from '#hooks/useSelected';
import { useSheetValue } from '#hooks/useSheetValue';
import type { Binding } from '#spreadsheet';

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
          {format(balance, 'financial')}
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

  let isExactBalance = true;

  for (const id of [...selectedItems].filter(isPreviewId)) {
    // Preview IDs are in the format `preview/<schedule_id>/<date>`
    const scheduleId = id.slice(8).split('/')[0];
    const schedule = schedules.find(s => s.id === scheduleId);
    if (schedule) {
      // If a schedule is `between X and Y` then we calculate the average
      if (schedule._amountOp === 'isbetween') {
        isExactBalance = false;
      }

      if (!account || account.id === schedule._account) {
        scheduleBalance += getScheduledAmount(schedule._amount);
      } else {
        scheduleBalance -= getScheduledAmount(schedule._amount);
      }
    }
  }

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
    />
  );
}

type FilteredBalanceProps = {
  filteredAmount?: number | null;
};

function FilteredBalance({ filteredAmount }: FilteredBalanceProps) {
  const { t } = useTranslation();

  return (
    <DetailedBalance
      name={t('Filtered balance:')}
      balance={filteredAmount ?? 0}
      isExactBalance
    />
  );
}

type BalanceOnDateProps = {
  date: string;
  balance: number | null;
  onClear: () => void;
};

function BalanceOnDate({ date, balance, onClear }: BalanceOnDateProps) {
  const { t } = useTranslation();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <DetailedBalance
        name={t('Balance on {{date}}:', {
          date: monthUtils.format(date, dateFormat),
        })}
        balance={balance ?? 0}
        isExactBalance={balance !== null}
      />
      <Button
        variant="bare"
        onPress={onClear}
        aria-label={t('Clear balance date')}
      >
        <SvgDelete style={{ width: 8, height: 8, margin: 4 }} />
      </Button>
    </View>
  );
}

type MoreBalancesProps = {
  balanceQuery: { name: `balance-query-${string}`; query: Query };
  balanceDate: string | null;
  balanceOnDate: number | null;
};

function MoreBalances({
  balanceQuery,
  balanceDate,
  balanceOnDate,
}: MoreBalancesProps) {
  const { t } = useTranslation();

  const query = balanceDate
    ? balanceQuery.query.filter({ date: { $lte: balanceDate } })
    : balanceQuery.query;
  const name = balanceDate
    ? `${balanceQuery.name}-${balanceDate}`
    : balanceQuery.name;

  const cleared = useSheetValue<'balance', `balance-query-${string}-cleared`>({
    name: (name + '-cleared') as `balance-query-${string}-cleared`,
    query: query.filter({ cleared: true }),
  });
  const uncleared = useSheetValue<
    'balance',
    `balance-query-${string}-uncleared`
  >({
    name: (name + '-uncleared') as `balance-query-${string}-uncleared`,
    query: query.filter({ cleared: false }),
  });

  // Scheduled transactions are never cleared, so on a chosen date they are
  // part of the uncleared total.
  const unclearedOnDate =
    balanceDate && balanceOnDate !== null
      ? balanceOnDate - (cleared ?? 0)
      : uncleared;

  return (
    <>
      <DetailedBalance name={t('Cleared total:')} balance={cleared ?? 0} />
      <DetailedBalance
        name={t('Uncleared total:')}
        balance={unclearedOnDate ?? 0}
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
  balanceDate?: string | null;
  balanceOnDate?: number | null;
  onClearBalanceDate?: () => void;
};

export function Balances({
  balanceQuery,
  showExtraBalances,
  onToggleExtraBalances,
  account,
  isFiltered,
  filteredAmount,
  balanceDate = null,
  balanceOnDate = null,
  onClearBalanceDate,
}: BalancesProps) {
  const selectedItems = useSelectedItems();
  const buttonRef = useRef<HTMLButtonElement>(null);
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
              style={{
                fontSize: 22,
                fontWeight: 400,
                color:
                  props.value < 0
                    ? theme.numberNegative
                    : props.value > 0
                      ? theme.numberPositive
                      : theme.pageTextSubdued,
              }}
            />
          )}
        </CellValue>

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

      {balanceDate && onClearBalanceDate && (
        <BalanceOnDate
          date={balanceDate}
          balance={balanceOnDate}
          onClear={onClearBalanceDate}
        />
      )}
      {showExtraBalances && (
        <MoreBalances
          balanceQuery={balanceQuery}
          balanceDate={balanceDate}
          balanceOnDate={balanceOnDate}
        />
      )}

      {selectedItems.size > 0 && (
        <SelectedBalance selectedItems={selectedItems} account={account} />
      )}
      {isFiltered && <FilteredBalance filteredAmount={filteredAmount} />}
    </View>
  );
}
