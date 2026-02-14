import React from 'react';
import type { CSSProperties } from 'react';

import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';

import { FinancialText } from '@desktop-client/components/FinancialText';
import { useFormat } from '@desktop-client/hooks/useFormat';

export function Change({
  amount,
  style,
}: {
  amount: number;
  style?: CSSProperties;
}) {
  const format = useFormat();

  return (
    <FinancialText
      as={Block}
      style={{
        ...styles.smallText,
        color:
          amount === 0
            ? theme.reportsNumberNeutral
            : amount < 0
              ? theme.reportsNumberNegative
              : theme.reportsNumberPositive,
        ...style,
      }}
    >
      {amount >= 0 ? '+' : ''}
      {format(amount, 'financial')}
    </FinancialText>
  );
}
