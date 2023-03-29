import React from 'react';

import { css } from 'glamor';

function View(props) {
  // The default styles are special-cased and pulled out into static
  // styles, and hardcode the class name here. View is used almost
  // everywhere and we can avoid any perf penalty that glamor would
  // incur.

  const { style, nativeStyle, innerRef, ...restProps } = props;
  return (
    <div
      {...restProps}
      ref={innerRef}
      style={nativeStyle}
      className={`view ${props.className || ''} ${css(props.style)}`}
    />
  );
}

export default View;
