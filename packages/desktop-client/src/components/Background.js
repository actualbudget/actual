import React from 'react';

import { css } from 'glamor';

import BG from './manager/bg.svg';

function Background({ selected }) {
  return (
    <div
      {...css({
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        background: `url(${BG}) no-repeat center center fixed`,
        backgroundSize: '100% 100%'
      })}
    ></div>
  );
}

export default Background;
