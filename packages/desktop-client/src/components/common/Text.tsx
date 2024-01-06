import React, { type HTMLProps, type Ref, type ReactNode } from 'react';

import { css } from 'glamor';

import { type CSSProperties } from '../../style';

type TextProps = HTMLProps<HTMLSpanElement> & {
  innerRef?: Ref<HTMLSpanElement>;
  className?: string;
  children?: ReactNode;
  style?: CSSProperties;
};

export const Text = (props: TextProps) => {
  const { className = '', style, innerRef, ...restProps } = props;
  return (
    <span
      {...restProps}
      ref={innerRef}
      className={`${className} ${css(style)}`}
    />
  );
};
