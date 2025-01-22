import React, {
  type HTMLProps,
  type Ref,
  type ReactNode,
  forwardRef,
} from 'react';

import { css, cx } from '@emotion/css';

import { type CSSProperties } from '../../style';

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
