import { useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgCheveronRight,
  SvgListBullet,
} from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { useNavigate } from '#hooks/useNavigate';
import { usePayees } from '#hooks/usePayees';
import { getSchedulesQuery, useSchedules } from '#hooks/useSchedules';
import { useSheetValue } from '#hooks/useSheetValue';
import { useTags } from '#hooks/useTags';
import * as bindings from '#spreadsheet/bindings';

import type { WidthMode } from './widthMode';

function usePendingCount() {
  return (
    useSheetValue<'account', 'pending-transaction-count'>(
      bindings.pendingTransactionCount(),
    ) ?? 0
  );
}

function useLast30DaysCount() {
  return (
    useSheetValue<'account', 'last-30-days-transaction-count'>(
      bindings.last30DaysTransactionCount(),
    ) ?? 0
  );
}

function useUpcomingScheduleCount() {
  const schedulesQuery = useMemo(() => getSchedulesQuery(), []);
  const { statuses } = useSchedules({ query: schedulesQuery });
  let count = 0;
  for (const status of statuses.values()) {
    if (status === 'due' || status === 'upcoming') {
      count += 1;
    }
  }
  return count;
}

function pendingFilterConditions() {
  return [
    {
      field: 'cleared' as const,
      op: 'is' as const,
      value: false,
      type: 'boolean' as const,
    },
  ];
}

function last30DaysFilterConditions() {
  return [
    {
      field: 'date' as const,
      op: 'gte' as const,
      value: monthUtils.subDays(monthUtils.currentDay(), 30),
      type: 'date' as const,
    },
  ];
}

export function TransactionsWidget({ widthMode }: { widthMode: WidthMode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pendingCount = usePendingCount();
  const last30DaysCount = useLast30DaysCount();
  const scheduledCount = useUpcomingScheduleCount();
  const { data: payees = [] } = usePayees();
  const { data: tags = [] } = useTags();

  const onAllTransactions = () => void navigate('/accounts');
  const onPending = () =>
    void navigate('/accounts', {
      state: { goBack: true, filterConditions: pendingFilterConditions() },
    });
  const onLast30Days = () =>
    void navigate('/accounts', {
      state: { goBack: true, filterConditions: last30DaysFilterConditions() },
    });
  const onScheduled = () => void navigate('/schedules');
  const onPayees = () => void navigate('/settings/payees');
  const onTags = () => void navigate('/settings/tags');

  if (widthMode === 'rail') {
    return (
      <View style={{ padding: '0 12px' }}>
        <Button
          variant="bare"
          aria-label={t('All transactions ({{count}} pending)', {
            count: pendingCount,
          })}
          onPress={onAllTransactions}
          style={{
            position: 'relative',
            width: 44,
            height: 36,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.pageTextSubdued,
          }}
        >
          <SvgListBullet width={18} height={18} />
          <PendingBadge count={pendingCount} />
        </Button>
      </View>
    );
  }

  if (widthMode === 'compact') {
    return (
      <View style={{ padding: '0 10px' }}>
        <Button
          variant="bare"
          onPress={onAllTransactions}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px',
            border: `1px solid ${theme.sidebarItemBackgroundHover}`,
            borderRadius: 6,
            color: theme.sidebarItemText,
            fontWeight: 500,
          }}
        >
          <SvgListBullet
            width={15}
            height={15}
            style={{ color: theme.sidebarItemAccentSelected }}
          />
          <span style={{ flex: 1, textAlign: 'left' }}>
            <Trans>Transactions</Trans>
          </span>
          <PendingBadge count={pendingCount} />
        </Button>
      </View>
    );
  }

  return (
    <View
      style={{
        margin: '0 12px',
        border: `1px solid ${theme.sidebarItemBackgroundHover}`,
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <Button
        variant="bare"
        onPress={onAllTransactions}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 9,
          padding: '9px 11px',
          backgroundColor: theme.sidebarItemBackgroundHover,
          color: theme.sidebarItemText,
          fontWeight: 500,
          borderRadius: 0,
        }}
      >
        <SvgListBullet
          width={16}
          height={16}
          style={{ color: theme.sidebarItemAccentSelected }}
        />
        <span style={{ flex: 1, textAlign: 'left' }}>
          <Trans>All transactions</Trans>
        </span>
        <SvgCheveronRight
          width={10}
          height={10}
          style={{ color: theme.pageTextSubdued }}
        />
      </Button>
      <View style={{ flexDirection: 'row' }}>
        <TransactionsStat
          label={t('pending')}
          onPress={onPending}
          valueStyle={{ color: theme.warningText }}
        >
          {pendingCount}
        </TransactionsStat>
        <TransactionsStat label={t('last 30 days')} onPress={onLast30Days}>
          {last30DaysCount}
        </TransactionsStat>
        <TransactionsStat
          label={t('scheduled')}
          onPress={onScheduled}
          valueStyle={{ color: theme.sidebarItemAccentSelected }}
        >
          {scheduledCount}
        </TransactionsStat>
      </View>
      <View
        style={{
          flexDirection: 'row',
          borderTop: `1px solid ${theme.sidebarItemBackgroundHover}`,
        }}
      >
        <TransactionsStat label={t('payees')} onPress={onPayees}>
          {payees.length}
        </TransactionsStat>
        <TransactionsStat label={t('tags')} onPress={onTags}>
          {tags.length}
        </TransactionsStat>
      </View>
    </View>
  );
}

function PendingBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }
  return (
    <span
      style={{
        position: 'absolute',
        right: 3,
        top: 3,
        minWidth: 13,
        height: 13,
        padding: '0 2px',
        borderRadius: 999,
        backgroundColor: theme.warningText,
        color: theme.pageBackground,
        fontSize: 8.5,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}
    >
      {count}
    </span>
  );
}

function TransactionsStat({
  label,
  onPress,
  valueStyle,
  children,
}: {
  label: string;
  onPress: () => void;
  valueStyle?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <Button
      variant="bare"
      onPress={onPress}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 1,
        padding: '7px 11px',
        borderRadius: 0,
        borderRight: `1px solid ${theme.sidebarItemBackgroundHover}`,
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 500, ...valueStyle }}>
        {children}
      </span>
      <span style={{ fontSize: 10, color: theme.pageTextSubdued }}>
        {label}
      </span>
    </Button>
  );
}
