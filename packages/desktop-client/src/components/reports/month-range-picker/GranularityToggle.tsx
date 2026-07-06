import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import type { MonthRangeGranularity } from './util';

type GranularityToggleProps = {
  value: MonthRangeGranularity;
  onChange: (value: MonthRangeGranularity) => void;
};

const segmentStyle = (selected: boolean) =>
  css({
    padding: '4px 12px',
    fontSize: 12,
    borderRadius: 0,
    ...(selected && {
      backgroundColor: theme.buttonPrimaryBackground,
      color: theme.buttonPrimaryText,
      ':hover': {
        backgroundColor: theme.buttonPrimaryBackgroundHover,
        color: theme.buttonPrimaryTextHover,
      },
    }),
  });

export function GranularityToggle({ value, onChange }: GranularityToggleProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        border: `1px solid ${theme.buttonNormalBorder}`,
        borderRadius: 4,
        overflow: 'hidden',
        alignSelf: 'flex-start',
      }}
    >
      <Button
        variant="bare"
        onPress={() => onChange('month')}
        className={segmentStyle(value === 'month')}
      >
        <Trans>Month</Trans>
      </Button>
      <Button
        variant="bare"
        onPress={() => onChange('day')}
        className={segmentStyle(value === 'day')}
      >
        <Trans>Day</Trans>
      </Button>
    </View>
  );
}
