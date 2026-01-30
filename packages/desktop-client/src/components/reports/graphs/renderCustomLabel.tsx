// @ts-strict-ignore
import React from 'react';
import type { SVGAttributes } from 'react';

import { theme } from '@actual-app/components/theme';

import { FinancialText } from '@desktop-client/components/FinancialText';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';

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
    <FinancialText
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
    </FinancialText>
  ) : (
    <text />
  );
};
