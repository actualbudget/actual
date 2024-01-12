import React from 'react';

import { theme } from '../../../style';

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
      x={calcX}
      y={calcY}
      fill={fill}
      textAnchor={textAnchor}
      dominantBaseline="middle"
      fontSize={textSize}
    >
      {display}
    </text>
  ) : (
    <text />
  );
};
