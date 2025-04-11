import React, {
  type HTMLProps,
  type Ref,
  type ReactNode,
  forwardRef,
} from 'react';

import { css, cx } from '@emotion/css';

import { styles, type CSSProperties } from './styles';

type TextSizes = 'large' | 'medium' | 'small' | 'tiny';

type TextProps = HTMLProps<HTMLSpanElement> & {
  innerRef?: Ref<HTMLSpanElement>;
  className?: string;
  children?: ReactNode;
  style?: CSSProperties;
  fontSize?: TextSizes;
};

function getTextSizeStyle(size: TextSizes | undefined) {
  switch (size) {
    case 'large':
      return styles.largeText;
    case 'medium':
      return styles.mediumText;
    case 'small':
      return styles.smallText;
    case 'tiny':
      return styles.tinyText;
  }
}

export const Text = forwardRef<HTMLSpanElement, TextProps>((props, ref) => {
  const { className = '', style, innerRef, fontSize, ...restProps } = props;

  const textSizeStyle = getTextSizeStyle(fontSize);

  return (
    <span
      {...restProps}
      ref={innerRef ?? ref}
      className={cx(className, textSizeStyle && css(textSizeStyle), css(style))}
    />
  );
});

Text.displayName = 'Text';
