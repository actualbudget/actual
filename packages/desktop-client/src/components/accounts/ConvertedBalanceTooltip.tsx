import React from 'react';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type CurrencyBalance } from '@desktop-client/hooks/useConvertedAccountBalance';
import { useFormat } from '@desktop-client/hooks/useFormat';

type ConvertedBalanceTooltipProps = {
  balances: CurrencyBalance[];
  convertedTotal: number;
  targetCurrency: string;
};

export function ConvertedBalanceTooltip({
  balances,
  convertedTotal,
  targetCurrency,
}: ConvertedBalanceTooltipProps) {
  const format = useFormat();

  return (
    <View style={{ padding: 10, minWidth: 150 }}>
      <Text
        style={{
          fontWeight: 600,
          marginBottom: 8,
          fontSize: 12,
          color: theme.pageText,
        }}
      >
        Currency Breakdown:
      </Text>
      {balances.map(({ currency, balance }) => {
        const displayCurrency = currency || targetCurrency;
        return (
          <View
            key={currency || 'default'}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <Text style={{ fontSize: 11, color: theme.pageTextSubdued }}>
              {displayCurrency}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: theme.pageTextSubdued,
                fontFamily: 'monospace',
              }}
            >
              {format(balance, 'financial', displayCurrency)}
            </Text>
          </View>
        );
      })}
      <View
        style={{
          height: 1,
          backgroundColor: theme.tableBorder,
          marginTop: 8,
          marginBottom: 8,
        }}
      />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: 600, color: theme.pageText }}>
          Total ({targetCurrency}):
        </Text>
        <Text
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: theme.pageText,
            fontFamily: 'monospace',
          }}
        >
          ≈ {format(convertedTotal, 'financial', targetCurrency)}
        </Text>
      </View>
    </View>
  );
}
