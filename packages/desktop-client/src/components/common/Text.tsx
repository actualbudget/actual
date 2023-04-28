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
      className={String(css([props.className, props.style]))}
    />
  );
};

export default Text;
