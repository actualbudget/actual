import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useHover } from 'usehooks-ts';

import { isPreviewId } from 'loot-core/shared/transactions';
import { useCachedSchedules } from 'loot-core/src/client/data-hooks/schedules';
import { q } from 'loot-core/src/shared/query';
import { getScheduledAmount } from 'loot-core/src/shared/schedules';

import { useSelectedItems } from '../../hooks/useSelected';
import { SvgArrowButtonRight1 } from '../../icons/v2';
import { theme } from '../../style';
import { Button } from '../common/Button2';
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

function SelectedBalance({ selectedItems, account }) {
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
      name={t('Selected balance:')}
      balance={balance}
      isExactBalance={isExactBalance}
    />
  );
}

function FilteredBalance({ filteredAmount }) {
  const { t } = useTranslation();

  return (
    <DetailedBalance
      name={t('Filtered balance:')}
      balance={filteredAmount || 0}
      isExactBalance={true}
    />
  );
}

function MoreBalances({ balanceQuery }) {
  const { t } = useTranslation();

  const cleared = useSheetValue({
    name: balanceQuery.name + '-cleared',
    query: balanceQuery.query.filter({ cleared: true }),
  });
  const uncleared = useSheetValue({
    name: balanceQuery.name + '-uncleared',
    query: balanceQuery.query.filter({ cleared: false }),
  });

  return (
    <View style={{ flexDirection: 'row' }}>
      <DetailedBalance name={t('Cleared total:')} balance={cleared} />
      <DetailedBalance name={t('Uncleared total:')} balance={uncleared} />
    </View>
  );
}

export function Balances({
  balanceQuery,
  showExtraBalances,
  onToggleExtraBalances,
  account,
  isFiltered,
  filteredAmount,
}) {
  const selectedItems = useSelectedItems();
  const buttonRef = useRef(null);
  const isButtonHovered = useHover(buttonRef);

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
        ref={buttonRef}
        data-testid="account-balance"
        variant="bare"
        onPress={onToggleExtraBalances}
        style={{
          paddingTop: 1,
          paddingBottom: 1,
        }}
      >
        <CellValue binding={{ ...balanceQuery, value: 0 }} type="financial">
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
      {showExtraBalances && <MoreBalances balanceQuery={balanceQuery} />}

      {selectedItems.size > 0 && (
        <SelectedBalance selectedItems={selectedItems} account={account} />
      )}
      {isFiltered && <FilteredBalance filteredAmount={filteredAmount} />}
    </View>
  );
}
