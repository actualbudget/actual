// @ts-strict-ignore
import React, { type SVGAttributes } from 'react';

import { theme } from '@actual-app/components/theme';

import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { TNum } from '@desktop-client/components/TNum';

export const renderCustomLabel = (
  calcX: SVGAttributes<SVGTextElement>['x'],
  calcY: SVGAttributes<SVGTextElement>['y'],
  textAnchor: SVGAttributes<SVGTextElement>['textAnchor'],
  display: string,
  textSize?: SVGAttributes<SVGTextElement>['fontSize'],
  showLabel?: number,
  showLabelThreshold?: number,
  fill: SVGAttributes<SVGTextElement>['fill'] = theme.pageText,
) => {
  return !showLabel || Math.abs(showLabel) > showLabelThreshold ? (
    <TNum
      as="text"
      key={fill + display}
      x={calcX}
      y={calcY}
      fill={fill}
      textAnchor={textAnchor}
      dominantBaseline="middle"
      fontSize={textSize}
    >
      <PrivacyFilter>{display}</PrivacyFilter>
    </TNum>
  ) : (
    <text />
  );
};
