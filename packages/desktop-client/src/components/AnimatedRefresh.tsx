// @ts-strict-ignore
import React, { type CSSProperties } from 'react';

import { SvgRefresh } from '@actual-app/components/icons/v1';
import { View } from '@actual-app/components/view';
import { keyframes } from '@emotion/css';

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
