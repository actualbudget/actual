import { Trans } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { ModeButton } from '#components/reports/ModeButton';

import type { MonthRangeGranularity } from './util';

const segmentStyle = { borderRadius: 0, fontSize: 12, padding: '4px 12px' };

type GranularityToggleProps = {
  value: MonthRangeGranularity;
  onChange: (value: MonthRangeGranularity) => void;
};

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
      <ModeButton
        selected={value === 'month'}
        onSelect={() => onChange('month')}
        style={segmentStyle}
      >
        <Trans>Month</Trans>
      </ModeButton>
      <ModeButton
        selected={value === 'day'}
        onSelect={() => onChange('day')}
        style={segmentStyle}
      >
        <Trans>Day</Trans>
      </ModeButton>
    </View>
  );
}
