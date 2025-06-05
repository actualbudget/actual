// @ts-strict-ignore
import React from 'react';

import { theme } from '@actual-app/components/theme';

import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';

export const renderCustomLabel = (
  calcX: number,
  calcY: number,
  textAnchor: string,
  display: string,
  textSize?: string,
  showLabel?: number,
  showLabelThreshold?: number,
  fill: string = theme.pageText,
) => {
  return !showLabel || Math.abs(showLabel) > showLabelThreshold ? (
    <text
      key={fill + display}
      x={calcX}
      y={calcY}
      fill={fill}
      textAnchor={textAnchor}
      dominantBaseline="middle"
      fontSize={textSize}
    >
      <PrivacyFilter>{display}</PrivacyFilter>
    </text>
  ) : (
    <text />
  );
};
