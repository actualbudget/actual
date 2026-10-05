import React from 'react';
import { Trans } from 'react-i18next';

import type { CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

import { getMonthStatus } from './monthStatus';

type MonthStatusBadgeProps = {
  month: string;
  currentMonth: string;
  style?: CSSProperties;
};

export function MonthStatusBadge({
  month,
  currentMonth,
  style,
}: MonthStatusBadgeProps) {
  const monthStatus = getMonthStatus(month, currentMonth);

  if (monthStatus === 'past') {
    return null;
  }

  const isCurrentMonth = monthStatus === 'current';

  return (
    <Text
      data-testid="month-status-badge"
      style={{
        flexShrink: 0,
        padding: '1px 5px',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: '14px',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        backgroundColor: isCurrentMonth
          ? theme.pillBackgroundSelected
          : theme.pillBackground,
        color: isCurrentMonth ? theme.pillTextSelected : theme.pillText,
        ...style,
      }}
    >
      {isCurrentMonth ? <Trans>Now</Trans> : <Trans>Plan</Trans>}
    </Text>
  );
}
