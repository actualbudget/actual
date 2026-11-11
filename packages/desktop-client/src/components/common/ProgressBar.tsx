import React from 'react';

import type { CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

type ProgressBarProps = {
  /** Fraction between 0 and 1 (values outside are clamped). */
  value: number;
  /** Fill color. Defaults to the positive number color. */
  color?: string;
  /** Height of the bar in pixels. */
  height?: number;
  /** Optional accessible label, e.g. "Expenses: 72% of budget spent". */
  'aria-label'?: string;
  style?: CSSProperties;
};

/**
 * A slim horizontal progress bar, used to show "how much of X has been used"
 * at a glance (e.g. spent vs. budgeted).
 */
export function ProgressBar({
  value,
  color = theme.numberPositive,
  height = 6,
  'aria-label': ariaLabel,
  style,
}: ProgressBarProps) {
  const fraction = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const percent = Math.round(fraction * 100);

  return (
    <View
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      data-testid="progress-bar"
      style={{
        height,
        borderRadius: height,
        backgroundColor: theme.tableBorder,
        overflow: 'hidden',
        width: '100%',
        ...style,
      }}
    >
      <View
        style={{
          height: '100%',
          width: `${percent}%`,
          borderRadius: height,
          backgroundColor: color,
          transition: 'width .3s ease',
        }}
      />
    </View>
  );
}
