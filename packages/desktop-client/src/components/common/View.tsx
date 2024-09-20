import React, {
  forwardRef,
  type HTMLProps,
  type Ref,
  type CSSProperties,
} from 'react';

import { css, cx } from '@emotion/css';

type ViewProps = HTMLProps<HTMLDivElement> & {
  className?: string;
  style?: CSSProperties;
  nativeStyle?: CSSProperties;
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
      className={cx('view', className, css(style))}
    />
  );
});

View.displayName = 'View';
