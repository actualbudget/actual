import React, {
  type HTMLProps,
  type Ref,
  type ReactNode,
  forwardRef,
} from 'react';

import { css } from 'glamor';

import { type CSSProperties } from '../../style';

type TextProps = HTMLProps<HTMLSpanElement> & {
  innerRef?: Ref<HTMLSpanElement>;
  className?: string;
  children?: ReactNode;
  style?: CSSProperties;
};

const processText = (text: string): ReactNode => {
  const tagRegex = /(#\w+)(?=\s|$)/g;

  const processedText = text.split(tagRegex).map((part, index) => {
    if (tagRegex.test(part)) {
      return (
        <span
          key={index}
          style={{
            backgroundColor: '#811331',
            borderRadius: '4px',
            padding: '2px 4px',
          }}
        >
          {part}
        </span>
      );
    }
    return part;
  });

  return processedText;
};

export const Text = forwardRef<HTMLSpanElement, TextProps>((props, ref) => {
  const { className = '', style, innerRef, children, ...restProps } = props;
  return (
    <span
      {...restProps}
      ref={innerRef ?? ref}
      className={`${className} ${css(style)}`}
    >
      {typeof children === 'string' ? processText(children) : children}
    </span>
  );
});

Text.displayName = 'Text';
