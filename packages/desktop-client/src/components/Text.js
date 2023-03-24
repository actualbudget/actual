import React from 'react';

import { css } from 'glamor';

function Text(props) {
  // Pull `numberOfLines` off since it's only used in React Native
  const { numberOfLines, style, innerRef, ...restProps } = props;
  return (
    <span
      {...restProps}
      ref={innerRef}
      className={`${props.className || ''} ${css(props.style)}`}
    />
  );
}

export default Text;
