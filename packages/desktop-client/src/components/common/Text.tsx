import React from 'react';

import { css } from 'glamor';
import type { CSSProperties } from 'glamor';

interface TextProps extends Omit<React.HTMLProps<HTMLSpanElement>, 'style'> {
  style?: CSSProperties;
  innerRef?: React.Ref<HTMLSpanElement>;
  className?: string;
  children?: React.ReactNode;
}

export const Text: React.FC<TextProps> = props => {
  const { style, innerRef, ...restProps } = props;
  return (
    <span
      {...restProps}
      ref={innerRef}
      className={`${props.className || ''} ${css(props.style)}`}
    />
  );
};

export default Text;
