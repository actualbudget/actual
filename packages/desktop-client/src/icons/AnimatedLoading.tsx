import React, { type SVGProps } from 'react';

import { css, keyframes } from 'glamor';

import Loading from './Loading';

const rotation = keyframes({
  '0%': { transform: 'rotate(-90deg)' },
  '100%': { transform: 'rotate(666deg)' },
});

function AnimatedLoading(props: SVGProps<SVGSVGElement>) {
  return (
    <span
      className={`${css({
        animationName: rotation,
        animationDuration: '1.6s',
        animationTimingFunction: 'cubic-bezier(0.17, 0.67, 0.83, 0.67)',
        animationIterationCount: 'infinite',
        lineHeight: 0,
      })}`}
    >
      <Loading {...props} />
    </span>
  );
}

export default AnimatedLoading;
