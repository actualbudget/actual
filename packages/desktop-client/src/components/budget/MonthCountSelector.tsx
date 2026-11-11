import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { useBudgetMonthCount } from './BudgetMonthCountContext';

type MonthCountSelectorProps = {
  maxMonths: number;
  onChange: (value: number) => void;
};

/**
 * Segmented control to choose how many months are shown side by side.
 */
export function MonthCountSelector({
  maxMonths,
  onChange,
}: MonthCountSelectorProps) {
  const { t } = useTranslation();

  const { displayMax } = useBudgetMonthCount();

  // It doesn't make sense to show anything if we can only fit one
  // month
  if (displayMax <= 1) {
    return null;
  }

  const options = [];
  for (let i = 1; i <= displayMax; i++) {
    options.push(i);
  }
  const selected = Math.min(Math.max(maxMonths, 1), displayMax);

  return (
    <Tooltip
      content={t('Choose the number of months shown at a time')}
      placement="bottom"
      style={styles.tooltip}
      triggerProps={{ delay: 400 }}
    >
      <View
        role="group"
        aria-label={t('Months shown')}
        data-testid="month-count-selector"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
          padding: 2,
          borderRadius: 8,
          border: `1px solid ${theme.buttonNormalBorder}`,
          backgroundColor: theme.buttonNormalBackground,
          WebkitAppRegion: 'no-drag',
        }}
      >
        <Text
          style={{
            fontSize: 12,
            color: theme.pageTextLight,
            padding: '0 6px 0 8px',
          }}
        >
          <Trans>Months</Trans>
        </Text>
        {options.map(count => {
          const isSelected = count === selected;
          return (
            <Button
              key={count}
              variant="bare"
              aria-pressed={isSelected}
              aria-label={t('{{count}} months', { count })}
              onPress={() => onChange(count)}
              className={css({
                minWidth: 26,
                padding: '3px 6px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                color: isSelected ? theme.buttonPrimaryText : theme.pageText,
                backgroundColor: isSelected
                  ? theme.buttonPrimaryBackground
                  : 'transparent',
                '&[data-hovered]': {
                  backgroundColor: isSelected
                    ? theme.buttonPrimaryBackgroundHover
                    : theme.buttonBareBackgroundHover,
                },
              })}
            >
              {count}
            </Button>
          );
        })}
      </View>
    </Tooltip>
  );
}
