import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { css } from '@emotion/css';

import { isPreviewId } from 'loot-core/shared/transactions';
import { useCachedSchedules } from 'loot-core/src/client/data-hooks/schedules';
import { q } from 'loot-core/src/shared/query';
import { getScheduledAmount } from 'loot-core/src/shared/schedules';

import { useSelectedItems } from '../../hooks/useSelected';
import { SvgArrowButtonRight1 } from '../../icons/v2';
import { theme } from '../../style';
import { ButtonWithLoading } from '../common/Button2';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { PrivacyFilter } from '../PrivacyFilter';
import { CellValue, CellValueText } from '../spreadsheet/CellValue';
import { useFormat } from '../spreadsheet/useFormat';
import { useSheetValue } from '../spreadsheet/useSheetValue';

function DetailedBalance({ name, balance, isExactBalance = true }) {
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

function SelectedBalance({ selectedItems, accountId }) {
  const { t } = useTranslation();

  const name = `selected-balance-${[...selectedItems].join('-')}`;

  const rows = useSheetValue({
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
  let balance = useSheetValue({
    name: name + '-sum',
    query: q('transactions')
      .filter({ id: { $oneof: finalIds } })
      .options({ splits: 'all' })
      .calculate({ $sum: '$amount' }),
  });

  let scheduleBalance = null;

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
      name={t('Selected balance:')}
      balance={balance}
      isExactBalance={isExactBalance}
    />
  );
}

function FilteredBalance({ filteredBalance }) {
  const { t } = useTranslation();
  return (
    <DetailedBalance
      name={t('Filtered balance:')}
      balance={filteredBalance || 0}
      isExactBalance={true}
    />
  );
}

function MoreBalances({ accountId, balanceQuery }) {
  const { t } = useTranslation();

  const cleared = useSheetValue({
    name: `balance-query-${accountId}-cleared`,
    query: balanceQuery?.filter({ cleared: true }),
  });
  const uncleared = useSheetValue({
    name: `balance-query-${accountId}-uncleared`,
    query: balanceQuery?.filter({ cleared: false }),
  });

  return (
    <View style={{ flexDirection: 'row' }}>
      <DetailedBalance name={t('Cleared total:')} balance={cleared} />
      <DetailedBalance name={t('Uncleared total:')} balance={uncleared} />
    </View>
  );
}

export function Balances({
  accountId,
  balanceQuery,
  filteredBalance,
  showFilteredBalance,
  showExtraBalances,
  onToggleExtraBalances,
}) {
  const selectedItems = useSelectedItems();
  // const balanceQuery = transactionsQuery?.calculate({ $sum: '$amount' });
  const balanceBinding = useMemo(
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
      {showExtraBalances && balanceQuery && (
        <MoreBalances
          accountId={accountId}
          // transactionsQuery={transactionsQuery}
          balanceQuery={balanceQuery}
        />
      )}
      {selectedItems.size > 0 && (
        <SelectedBalance selectedItems={selectedItems} accountId={accountId} />
      )}
      {showFilteredBalance && (
        <FilteredBalance filteredBalance={filteredBalance} />
      )}
    </View>
  );
}
