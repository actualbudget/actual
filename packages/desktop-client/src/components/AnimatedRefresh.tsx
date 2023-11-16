import React from 'react';

import { keyframes } from 'glamor';

import Refresh from '../icons/v1/Refresh';
import { type CSSProperties } from '../style';

import View from './common/View';

let spin = keyframes({
  '0%': { transform: 'rotateZ(0deg)' },
  '100%': { transform: 'rotateZ(360deg)' },
});

type AnimatedRefreshProps = {
  animating: boolean;
  iconStyle?: CSSProperties;
};

export default function AnimatedRefresh({
  animating,
  iconStyle,
}: AnimatedRefreshProps) {
  return (
    <View
      style={{ animation: animating ? `${spin} 1s infinite linear` : null }}
    >
      <Refresh width={14} height={14} style={iconStyle} />
    </View>
  );
}
