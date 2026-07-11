import { ModeButton } from '#ModeButton';
import { theme } from '#theme';
import { View } from '#View';

import type { DateRangeGranularity } from './util';

const segmentStyle = { borderRadius: 0, fontSize: 12, padding: '4px 12px' };

type GranularityToggleProps = {
  value: DateRangeGranularity;
  monthLabel: string;
  dayLabel: string;
  onChange: (value: DateRangeGranularity) => void;
};

export function GranularityToggle({
  value,
  monthLabel,
  dayLabel,
  onChange,
}: GranularityToggleProps) {
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
        {monthLabel}
      </ModeButton>
      <ModeButton
        selected={value === 'day'}
        onSelect={() => onChange('day')}
        style={segmentStyle}
      >
        {dayLabel}
      </ModeButton>
    </View>
  );
}
