import React from 'react';

import { useCachedSchedules } from 'loot-core/src/client/data-hooks/schedules';
import q from 'loot-core/src/client/query-helpers';

import { useSelectedItems } from '../../hooks/useSelected';
import ArrowButtonRight1 from '../../icons/v2/ArrowButtonRight1';
import { colors } from '../../style';
import { View, Text, Button } from '../common';
import CellValue from '../spreadsheet/CellValue';
import format from '../spreadsheet/format';
import useSheetValue from '../spreadsheet/useSheetValue';
import { isPreviewId } from '../transactions/TransactionsTable';

function DetailedBalance({ name, balance }) {
  return (
    <Text
      style={{
        marginLeft: 15,
        backgroundColor: colors.n9,
        borderRadius: 4,
        padding: '4px 6px',
        color: colors.n5,
      }}
    >
      {name}{' '}
      <Text style={{ fontWeight: 600 }}>{format(balance, 'financial')}</Text>
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
  for (let s of schedules) {
    if (previewIds.includes(s.id)) {
      if (!account || account.id === s._account) {
        scheduleBalance += s._amount;
      } else {
        scheduleBalance -= s._amount;
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

  return <DetailedBalance name="Selected balance:" balance={balance} />;
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
        bare
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
            color: value < 0 ? colors.r5 : value > 0 ? colors.g5 : colors.n8,
          })}
        />

        <ArrowButtonRight1
          style={{
            width: 10,
            height: 10,
            marginLeft: 10,
            color: colors.n5,
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
