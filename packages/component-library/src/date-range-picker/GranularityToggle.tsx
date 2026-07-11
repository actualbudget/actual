import type { ReactNode } from 'react';

import { css } from '@emotion/css';

import { Button } from '#Button';
import { theme } from '#theme';
import { View } from '#View';

import type { DateRangeGranularity } from './util';

type SegmentButtonProps = {
  selected: boolean;
  children: ReactNode;
  onSelect: () => void;
};

function SegmentButton({ selected, children, onSelect }: SegmentButtonProps) {
  return (
    <Button
      variant="bare"
      className={css({
        padding: '4px 12px',
        borderRadius: 0,
        fontSize: 12,
        backgroundColor: theme.menuBackground,
        ...(selected && {
          backgroundColor: theme.buttonPrimaryBackground,
          color: theme.buttonPrimaryText,
          ':hover': {
            backgroundColor: theme.buttonPrimaryBackgroundHover,
            color: theme.buttonPrimaryTextHover,
          },
        }),
      })}
      onPress={onSelect}
    >
      {children}
    </Button>
  );
}

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
      <SegmentButton
        selected={value === 'month'}
        onSelect={() => onChange('month')}
      >
        {monthLabel}
      </SegmentButton>
      <SegmentButton
        selected={value === 'day'}
        onSelect={() => onChange('day')}
      >
        {dayLabel}
      </SegmentButton>
    </View>
  );
}
