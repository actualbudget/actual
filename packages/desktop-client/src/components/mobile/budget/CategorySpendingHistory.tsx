import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { radius, spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type {
  CategoryEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { useQuery } from '#hooks/useQuery';

import { LABEL_STYLE, ROW_PADDING_X } from './budgetTableStyles';

const HISTORY_MONTHS = 6;
const BAR_AREA_HEIGHT = 52;
const BAR_WIDTH = 16;
const MIN_BAR_HEIGHT = 2;

type CategorySpendingHistoryProps = {
  category: CategoryEntity;
  month: string;
};

export function CategorySpendingHistory({
  category,
  month,
}: CategorySpendingHistoryProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const format = useFormat();
  const [pressedMonth, setPressedMonth] = useState<string | null>(null);
  const startMonth = monthUtils.subMonths(month, HISTORY_MONTHS - 1);
  const months = monthUtils.rangeInclusive(startMonth, month);
  const activeMonth =
    pressedMonth != null && months.includes(pressedMonth) ? pressedMonth : null;

  const { data: transactions, isLoading } = useQuery<
    Pick<TransactionEntity, 'date' | 'amount'>
  >(
    () =>
      q('transactions')
        .filter({
          category: category.id,
          'account.offbudget': false,
          date: {
            $gte: monthUtils.firstDayOfMonth(startMonth),
            $lte: monthUtils.lastDayOfMonth(month),
          },
        })
        .options({ splits: 'inline' })
        .select(['date', 'amount']),
    [category.id, startMonth, month],
  );

  const spentByMonth = new Map(months.map(m => [m, 0]));
  for (const transaction of transactions ?? []) {
    const transactionMonth = monthUtils.monthFromDate(transaction.date);
    if (spentByMonth.has(transactionMonth)) {
      spentByMonth.set(
        transactionMonth,
        (spentByMonth.get(transactionMonth) ?? 0) + transaction.amount,
      );
    }
  }

  const sign = category.is_income ? 1 : -1;
  const spentAmounts = months.map(m =>
    Math.max(0, sign * (spentByMonth.get(m) ?? 0)),
  );
  const maxSpent = Math.max(...spentAmounts, 1);
  const hasSpending = spentAmounts.some(amount => amount > 0);

  if (isLoading) {
    return null;
  }

  return (
    <View
      style={{
        padding: `${spacing.md}px ${ROW_PADDING_X}px`,
        borderBottomWidth: 1,
        borderColor: theme.tableBorder,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: spacing.sm,
        }}
      >
        <Text style={LABEL_STYLE}>
          {category.is_income
            ? t('Income · last {{months}} months', { months: HISTORY_MONTHS })
            : t('Spending · last {{months}} months', {
                months: HISTORY_MONTHS,
              })}
        </Text>
        {activeMonth != null && (
          <Text
            style={{
              ...styles.tnum,
              ...styles.verySmallText,
              fontWeight: 600,
              color: theme.pageTextDark,
            }}
          >
            {t('{{month}} · {{amount}}', {
              month: monthUtils.format(activeMonth, 'MMM yyyy', locale),
              amount: format(
                spentAmounts[months.indexOf(activeMonth)],
                'financial',
              ),
            })}
          </Text>
        )}
      </View>
      {hasSpending ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {months.map((m, index) => {
            const spent = spentAmounts[index];
            const isSelected = m === month;
            const isActive = m === activeMonth;
            return (
              <Button
                key={m}
                variant="bare"
                onPress={() =>
                  setPressedMonth(current => (current === m ? null : m))
                }
                aria-pressed={isActive}
                aria-label={t('{{month}}: {{amount}}', {
                  month: monthUtils.format(m, 'MMMM yyyy', locale),
                  amount: format(spent, 'financial'),
                })}
                style={{
                  flex: 1,
                  flexDirection: 'column',
                  gap: spacing.xs,
                  padding: 0,
                  backgroundColor: isActive ? theme.pageBackground : undefined,
                  borderRadius: radius.sm,
                }}
              >
                <View
                  style={{
                    height: BAR_AREA_HEIGHT,
                    justifyContent: 'flex-end',
                  }}
                >
                  <View
                    style={{
                      width: BAR_WIDTH,
                      height: Math.max(
                        MIN_BAR_HEIGHT,
                        (spent / maxSpent) * BAR_AREA_HEIGHT,
                      ),
                      borderRadius: `${radius.sm}px ${radius.sm}px 0 0`,
                      backgroundColor:
                        isSelected || isActive
                          ? theme.pageTextPositive
                          : theme.pageTextSubdued,
                    }}
                  />
                </View>
                <Text
                  style={{
                    ...styles.verySmallText,
                    color: theme.pageTextLight,
                  }}
                >
                  {monthUtils.format(m, 'MMM', locale)}
                </Text>
              </Button>
            );
          })}
        </View>
      ) : (
        <Text style={{ ...styles.verySmallText, color: theme.pageTextLight }}>
          {category.is_income
            ? t('No income in the last {{months}} months.', {
                months: HISTORY_MONTHS,
              })
            : t('No spending in the last {{months}} months.', {
                months: HISTORY_MONTHS,
              })}
        </Text>
      )}
    </View>
  );
}
