import React, { forwardRef } from 'react';
import type { HTMLProps, ReactNode, Ref } from 'react';

import { css, cx } from '@emotion/css';

import type { CSSProperties } from './styles';
import {
  componentSizeText,
  sizeResponsiveStyles,
  type ComponentSize,
} from './tokens';

type TextProps = Omit<HTMLProps<HTMLSpanElement>, 'size' | 'style'> & {
  innerRef?: Ref<HTMLSpanElement>;
  className?: string;
  size?: ComponentSize;
  children?: ReactNode;
  style?: CSSProperties;
};

// Per-size typography, varying by breakpoint via media queries (no
// hooks). Precomputed once at module level so rendering stays cheap.
const getTextSizeStyles = (size: ComponentSize): Record<string, unknown> => {
  const text = componentSizeText[size];

  const getGroupStyles = (group: keyof typeof text) => {
    const { fontSize, lineHeight } = text[group];

    return { fontSize, lineHeight };
  };

  return sizeResponsiveStyles({
    narrow: getGroupStyles('narrow'),
    small: getGroupStyles('small'),
    medium: getGroupStyles('medium'),
    wide: getGroupStyles('wide'),
  });
};

const textSizeStyles = {
  small: getTextSizeStyles('small'),
  medium: getTextSizeStyles('medium'),
  large: getTextSizeStyles('large'),
  'extra-large': getTextSizeStyles('extra-large'),
} satisfies Record<ComponentSize, Record<string, unknown>>;

export const Text = forwardRef<HTMLSpanElement, TextProps>((props, ref) => {
  const { className = '', style, innerRef, size, ...restProps } = props;
  return (
    <span
      {...restProps}
      ref={innerRef ?? ref}
      className={
        size
          ? cx(className, css({ ...textSizeStyles[size], ...style }))
          : cx(className, css(style))
      }
    />
  );
});

Text.displayName = 'Text';
