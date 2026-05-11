import { Trans } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { TransactionEntity } from '@actual-app/core/types/models';

import { useFormat } from '#hooks/useFormat';

type SplitTransactionSummaryProps = {
  transaction: TransactionEntity;
  percentageAllocated: number;
  remainingAmount: number;
};

export function SplitTransactionSummary({
  transaction,
  percentageAllocated,
  remainingAmount,
}: SplitTransactionSummaryProps) {
  const format = useFormat();

  return (
    <>
      <View
        style={{
          padding: 15,
          backgroundColor: theme.tableBackground,
          borderRadius: 4,
          marginBottom: 20,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <Text style={{ fontWeight: 600 }}>
            <Trans>Transaction Amount:</Trans>
          </Text>
          <Text style={{ ...styles.tnum, fontWeight: 600 }}>
            {format(transaction.amount, 'financial')}
          </Text>
        </View>
        {transaction.payee && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: theme.pageTextSubdued }}>
              <Trans>Payee:</Trans>
            </Text>
            <Text>{transaction.payee}</Text>
          </View>
        )}
      </View>

      <View style={{ marginBottom: 20 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: 500 }}>
            <Trans>Allocated:</Trans> {percentageAllocated.toFixed(1)}%
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontWeight: 500,
              color:
                remainingAmount === 0
                  ? theme.noticeTextLight
                  : theme.warningText,
            }}
          >
            <Trans>Remaining:</Trans> {format(remainingAmount, 'financial')}
          </Text>
        </View>
        <View
          style={{
            height: 8,
            backgroundColor: theme.tableBackground,
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${Math.min(percentageAllocated, 100)}%`,
              backgroundColor:
                remainingAmount === 0
                  ? theme.noticeBackground
                  : remainingAmount < 0
                    ? theme.errorBackground
                    : theme.warningBackground,
              transition: 'width 0.3s ease',
            }}
          />
        </View>
      </View>
    </>
  );
}
