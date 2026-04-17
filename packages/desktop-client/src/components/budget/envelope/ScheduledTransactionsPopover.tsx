import type { RefObject } from 'react';
import { useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { q } from '@actual-app/core/shared/query';
import * as monthUtils from '@actual-app/core/shared/months';
import type { TransactionEntity } from '@actual-app/core/types/models';

import { PrivacyFilter } from '#components/PrivacyFilter';
import { useCachedSchedules } from '#hooks/useCachedSchedules';
import { useFormat } from '#hooks/useFormat';
import { usePayeesById } from '#hooks/usePayees';
import { useQuery } from '#hooks/useQuery';

type ScheduledTransactionsPopoverProps = {
  triggerRef: RefObject<HTMLElement | SVGElement | null>;
  isOpen: boolean;
  onClose: () => void;
  upcomingTransactions: TransactionEntity[];
  categoryId: string;
  month: string;
  onViewTransactions: () => void;
};

export function ScheduledTransactionsPopover({
  triggerRef,
  isOpen,
  onClose,
  upcomingTransactions,
  categoryId,
  month,
  onViewTransactions,
}: ScheduledTransactionsPopoverProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const { schedules } = useCachedSchedules();
  const scheduleById = new Map(schedules.map(s => [s.id, s]));
  const { data: payeesById } = usePayeesById();

  const transactionsQuery = useMemo(
    () =>
      q('transactions')
        .options({ splits: 'inline' })
        .filter({
          category: categoryId,
          date: { $transform: '$month', $eq: month },
        })
        .select('*')
        .orderBy({ date: 'desc' }),
    [categoryId, month],
  );

  const { data } = useQuery<TransactionEntity>(
    () => transactionsQuery,
    [transactionsQuery],
  );
  const actualTransactions = data ?? [];

  const hasAny =
    actualTransactions.length > 0 || upcomingTransactions.length > 0;

  return (
    <Popover
      triggerRef={triggerRef}
      placement="bottom end"
      isOpen={isOpen}
      onOpenChange={isOpen => {
        if (!isOpen) onClose();
      }}
      style={{
        padding: '8px 10px',
        minWidth: 240,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 380,
      }}
    >
      <View style={{ overflowY: 'auto', flex: 1 }}>
        {actualTransactions.length > 0 && (
          <>
            <View
              style={{ marginBottom: 4, fontWeight: 600, ...styles.smallText }}
            >
              {t('Payments')}
            </View>
            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: theme.tableBorder,
                marginBottom: 6,
              }}
            />
            {actualTransactions.map((tx, i) => {
              const payeeName = tx.payee
                ? (payeesById?.[tx.payee]?.name ?? tx.notes ?? '—')
                : (tx.notes ?? '—');
              const date = monthUtils.format(tx.date, 'MMM d');
              return (
                <View
                  key={tx.id ?? i}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    ...styles.smallText,
                    color: theme.tableText,
                    paddingBottom: 3,
                  }}
                >
                  <View>
                    <View style={{ fontWeight: 500 }}>{payeeName}</View>
                    <View style={{ color: theme.pageTextSubdued }}>{date}</View>
                  </View>
                  <PrivacyFilter>
                    <View style={{ ...styles.tnum, color: theme.errorText }}>
                      {format(tx.amount, 'financial')}
                    </View>
                  </PrivacyFilter>
                </View>
              );
            })}
          </>
        )}

        {upcomingTransactions.length > 0 && (
          <>
            <View
              style={{
                marginTop: actualTransactions.length > 0 ? 8 : 0,
                marginBottom: 4,
                fontWeight: 600,
                ...styles.smallText,
              }}
            >
              {t('Upcoming Payments')}
            </View>
            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: theme.tableBorder,
                marginBottom: 6,
              }}
            />
            {upcomingTransactions.map((tx, i) => {
              const schedule = tx.schedule
                ? scheduleById.get(tx.schedule)
                : undefined;
              const name = schedule?.name ?? tx.schedule ?? '—';
              const date = monthUtils.format(tx.date, 'MMM d');
              return (
                <View
                  key={tx.id ?? i}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    ...styles.smallText,
                    color: theme.tableText,
                    paddingBottom: 3,
                  }}
                >
                  <View>
                    <View style={{ fontWeight: 500 }}>{name}</View>
                    <View style={{ color: theme.pageTextSubdued }}>{date}</View>
                  </View>
                  <PrivacyFilter>
                    <View style={{ ...styles.tnum, color: theme.errorText }}>
                      {format(tx.amount, 'financial')}
                    </View>
                  </PrivacyFilter>
                </View>
              );
            })}
          </>
        )}
      </View>

      <Button
        variant="bare"
        style={{
          marginTop: hasAny ? 6 : 0,
          fontSize: 'inherit',
          color: theme.pageTextPositive,
          padding: 0,
          flexShrink: 0,
        }}
        onPress={() => {
          onViewTransactions();
          onClose();
        }}
      >
        <Trans>View transactions</Trans> →
      </Button>
    </Popover>
  );
}
