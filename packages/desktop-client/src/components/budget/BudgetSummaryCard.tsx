import React from 'react';
import type { ReactNode } from 'react';

import type { CSSProperties } from '@actual-app/components/styles';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

type BudgetSummaryCardProps = {
  title?: ReactNode;
  isCurrentMonth: boolean;
  style?: CSSProperties;
  children: ReactNode;
};

export function BudgetSummaryCard({
  title,
  isCurrentMonth,
  style,
  children,
}: BudgetSummaryCardProps) {
  return (
    <View
      style={{
        backgroundColor: isCurrentMonth
          ? theme.budgetCurrentMonth
          : theme.budgetOtherMonth,
        boxShadow: styles.cardShadow,
        borderRadius: 6,
        padding: '10px 16px',
        cursor: 'default',
        '& .hover-visible': {
          opacity: 0,
          transition: 'opacity .25s',
        },
        '&:hover .hover-visible': {
          opacity: 1,
        },
        ...style,
      }}
    >
      {title && (
        <Text
          style={{
            ...styles.smallText,
            color: theme.pageTextLight,
            marginBottom: 2,
          }}
        >
          {title}
        </Text>
      )}
      {children}
    </View>
  );
}
