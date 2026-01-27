import React, {
  forwardRef,
  type HTMLProps,
  type ReactNode,
  type Ref,
} from 'react';

import { css, cx } from '@emotion/css';

import { type CSSProperties } from './styles';

type TextProps = HTMLProps<HTMLSpanElement> & {
  innerRef?: Ref<HTMLSpanElement>;
  className?: string;
  children?: ReactNode;
  style?: CSSProperties;
};

export const Text = forwardRef<HTMLSpanElement, TextProps>((props, ref) => {
  const { className = '', style, innerRef, ...restProps } = props;
  return (
    <span
      {...restProps}
      ref={innerRef ?? ref}
      className={cx(className, css(style))}
    />
  );
});

Text.displayName = 'Text';
