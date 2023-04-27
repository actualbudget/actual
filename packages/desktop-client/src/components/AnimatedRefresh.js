import React from 'react';

import { css } from 'glamor';

import Refresh from '../icons/v1/Refresh';

import View from './common/View';

let spin = css.keyframes({
  '0%': { transform: 'rotateZ(0deg)' },
  '100%': { transform: 'rotateZ(360deg)' },
});

export default function AnimatedRefresh({ animating, iconStyle }) {
  return (
    <View
      style={[{ animation: animating ? `${spin} 1s infinite linear` : null }]}
    >
      <Refresh
        width={14}
        height={14}
        style={{ color: 'currentColor', ...iconStyle }}
      />
    </View>
  );
}
