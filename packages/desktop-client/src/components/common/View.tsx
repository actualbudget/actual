import React, {
  forwardRef,
  type HTMLProps,
  type Ref,
  type StyleHTMLAttributes,
} from 'react';

import { css } from 'glamor';

import { type CSSProperties } from '../../style';

type ViewProps = HTMLProps<HTMLDivElement> & {
  className?: string;
  style?: CSSProperties;
  nativeStyle?: StyleHTMLAttributes<HTMLDivElement>;
  innerRef?: Ref<HTMLDivElement>;
};

export const View = forwardRef<HTMLDivElement, ViewProps>((props, ref) => {
  // The default styles are special-cased and pulled out into static
  // styles, and hardcode the class name here. View is used almost
  // everywhere and we can avoid any perf penalty that glamor would
  // incur.

  const { className = '', style, nativeStyle, innerRef, ...restProps } = props;
  return (
    <div
      {...restProps}
      ref={innerRef ?? ref}
      style={nativeStyle}
      className={`view ${className} ${css(style)}`}
    />
  );
});

View.displayName = 'View';
