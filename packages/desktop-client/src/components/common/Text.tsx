import React, { type HTMLProps, type Ref, type ReactNode } from 'react';

import { css } from 'glamor';

type TextProps = HTMLProps<HTMLSpanElement> & {
  innerRef?: Ref<HTMLSpanElement>;
  className?: string;
  children?: ReactNode;
};

const Text = (props: TextProps) => {
  const { style, innerRef, ...restProps } = props;
  return (
    <span
      {...restProps}
      ref={innerRef}
      className={`${props.className} ${css(props.style)}`}
    />
  );
};

export default Text;
