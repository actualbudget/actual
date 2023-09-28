import React from 'react';

import { useCachedSchedules } from 'loot-core/src/client/data-hooks/schedules';
import q from 'loot-core/src/client/query-helpers';
import { getScheduledAmount } from 'loot-core/src/shared/schedules';

import { useSelectedItems } from '../../hooks/useSelected';
import ArrowButtonRight1 from '../../icons/v2/ArrowButtonRight1';
import { theme } from '../../style';
import Button from '../common/Button';
import Text from '../common/Text';
import View from '../common/View';
import PrivacyFilter from '../PrivacyFilter';
import CellValue from '../spreadsheet/CellValue';
import useFormat from '../spreadsheet/useFormat';
import useSheetValue from '../spreadsheet/useSheetValue';
import { isPreviewId } from '../transactions/TransactionsTable';

function DetailedBalance({ name, balance, isExactBalance = true }) {
  const format = useFormat();
  return (
    <Text
      style={{
        marginLeft: 15,
        borderRadius: 4,
        padding: '4px 6px',
        color: theme.alt2PillText,
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
  let name = `selected-balance-${[...selectedItems].join('-')}`;

  let rows = useSheetValue({
    name,
    query: q('transactions')
      .filter({
        id: { $oneof: [...selectedItems] },
        parent_id: { $oneof: [...selectedItems] },
      })
      .select('id'),
  });
  let ids = new Set((rows || []).map(r => r.id));

  let finalIds = [...selectedItems].filter(id => !ids.has(id));
  let balance = useSheetValue({
    name: name + '-sum',
    query: q('transactions')
      .filter({ id: { $oneof: finalIds } })
      .options({ splits: 'all' })
      .calculate({ $sum: '$amount' }),
  });

  let scheduleBalance = null;
  let scheduleData = useCachedSchedules();
  let schedules = scheduleData ? scheduleData.schedules : [];
  let previewIds = [...selectedItems]
    .filter(id => isPreviewId(id))
    .map(id => id.slice(8));
  let isExactBalance = true;

  for (let s of schedules) {
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
      name="Selected balance:"
      balance={balance}
      isExactBalance={isExactBalance}
    />
  );
}

function MoreBalances({ balanceQuery }) {
  let cleared = useSheetValue({
    name: balanceQuery.name + '-cleared',
    query: balanceQuery.query.filter({ cleared: true }),
  });
  let uncleared = useSheetValue({
    name: balanceQuery.name + '-uncleared',
    query: balanceQuery.query.filter({ cleared: false }),
  });

  return (
    <View style={{ flexDirection: 'row' }}>
      <DetailedBalance name="Cleared total:" balance={cleared} />
      <DetailedBalance name="Uncleared total:" balance={uncleared} />
    </View>
  );
}

export function Balances({
  balanceQuery,
  showExtraBalances,
  onToggleExtraBalances,
  account,
}) {
  let selectedItems = useSelectedItems();

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
                ? theme.noticeText
                : theme.pageTextSubdued,
          })}
          privacyFilter={{
            blurIntensity: 5,
          }}
        />

        <ArrowButtonRight1
          style={{
            width: 10,
            height: 10,
            marginLeft: 10,
            color: theme.alt2PillText,
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
