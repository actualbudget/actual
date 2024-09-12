// @ts-strict-ignore
import React from 'react';

import { keyframes } from '@emotion/css';

import { SvgRefresh } from '../icons/v1';
import { type CSSProperties } from '../style';

import { View } from './common/View';

const spin = keyframes({
  '0%': { transform: 'rotateZ(0deg)' },
  '100%': { transform: 'rotateZ(360deg)' },
});

type AnimatedRefreshProps = {
  animating: boolean;
  iconStyle?: CSSProperties;
  width?: number;
  height?: number;
};

export function AnimatedRefresh({
  animating,
  iconStyle,
  width,
  height,
}: AnimatedRefreshProps) {
  return (
    <View
      style={{ animation: animating ? `${spin} 1s infinite linear` : null }}
    >
      <SvgRefresh
        width={width ? width : 14}
        height={height ? height : 14}
        style={iconStyle}
      />
    </View>
  );
}
