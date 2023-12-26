import React from 'react';

import { theme } from '../../../style';

import { adjustDonutTextSize, adjustTextSize } from './adjustTextSize';

export const renderCustomLabel = (
  props,
  showLabel?: string,
  showLabelThreshold?: number,
  width?: number,
) => {
  const RADIAN = Math.PI / 180;
  const radius =
    props.innerRadius &&
    props.innerRadius + (props.outerRadius - props.innerRadius) * 0.5;

  let calcX;
  let calcY;

  if (props.width) {
    calcX = props.x + props.width / 2;
    if (showLabelThreshold === 20) {
      calcY = props.y + props.height / 2;
    } else {
      calcY = props.y - (props.value > 0 ? 15 : -15);
    }
  } else if (props.cx) {
    calcX = props.cx + radius * Math.cos(-props.midAngle * RADIAN);
    calcY = props.cy + radius * Math.sin(-props.midAngle * RADIAN);
  } else {
    calcX = props.x;
    calcY = props.y;
  }

  const textAnchor = props.cx
    ? props.x > props.cx
      ? 'start'
      : 'end'
    : 'middle';

  const donutSize = props.cx > props.cy ? props.cy : props.cx;
  const cartesianSize = 290;
  const size = props.cx ? donutSize : cartesianSize;

  return Math.abs(props[showLabel]) > showLabelThreshold ? (
    <text
      x={calcX}
      y={calcY}
      fill={theme.pageText}
      textAnchor={textAnchor}
      dominantBaseline="middle"
      fontSize={width ? adjustTextSize(width) : adjustDonutTextSize(size)}
    >
      {props.cx
        ? `${(props.percent * 100).toFixed(0)}%`
        : props.value.toFixed(0)}
    </text>
  ) : (
    <text />
  );
};
