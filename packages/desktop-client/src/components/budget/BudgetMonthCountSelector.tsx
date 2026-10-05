import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ModeButton } from '@actual-app/components/mode-button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

const segmentStyle = {
  backgroundColor: 'transparent',
  borderRadius: 3,
  fontSize: 13,
  minWidth: 24,
  height: 22,
  padding: '0 7px',
};

type BudgetMonthCountSelectorProps = {
  value: number;
  maxCount: number;
  height: number;
  onChange: (monthCount: number) => void;
};

export function BudgetMonthCountSelector({
  value,
  maxCount,
  height,
  onChange,
}: BudgetMonthCountSelectorProps) {
  const { t } = useTranslation();

  // It doesn't make sense to show anything if we can only fit one
  // month
  if (maxCount <= 1) {
    return null;
  }

  const monthCounts = Array.from({ length: maxCount }, (_, index) => index + 1);

  return (
    <View
      role="group"
      aria-label={t('Choose the number of months shown at a time')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
        gap: 2,
        height,
        padding: '0 2px 0 8px',
        border: `1px solid ${theme.buttonNormalBorder}`,
        borderRadius: 4,
        backgroundColor: theme.buttonNormalBackground,
      }}
    >
      <Text
        style={{ fontSize: 13, marginRight: 4, color: theme.pageTextLight }}
      >
        <Trans>Months</Trans>
      </Text>
      {monthCounts.map(monthCount => (
        <ModeButton
          key={monthCount}
          selected={monthCount === value}
          aria-pressed={monthCount === value}
          style={segmentStyle}
          onSelect={() => onChange(monthCount)}
        >
          {monthCount}
        </ModeButton>
      ))}
    </View>
  );
}
