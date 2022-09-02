import React from 'react';

import { css } from 'glamor';

import Loading from './Loading';

const rotation = css.keyframes({
  '0%': { transform: 'rotate(-90deg)' },
  '100%': { transform: 'rotate(666deg)' }
});

function AnimatedLoading({ width, height, style, color }) {
  return (
    <span
      {...css({
        animationName: rotation,
        animationDuration: '1.6s',
        animationTimingFunction: 'cubic-bezier(0.17, 0.67, 0.83, 0.67)',
        animationIterationCount: 'infinite'
      })}
    >
      <Loading width={width} height={height} color={color} />
    </span>
  );
}

export default AnimatedLoading;
