import React from 'react';

import { css } from 'glamor';
import type { CSSProperties } from 'glamor';

interface ViewProps extends Omit<React.HTMLProps<HTMLDivElement>, 'style'> {
  className?: string;
  style?: CSSProperties;
  nativeStyle?: React.StyleHTMLAttributes<HTMLDivElement>;
  innerRef?: React.Ref<HTMLDivElement>;
}

const View: React.FC<ViewProps> = props => {
  // The default styles are special-cased and pulled out into static
  // styles, and hardcode the class name here. View is used almost
  // everywhere and we can avoid any perf penalty that glamor would
  // incur.

  const { style, nativeStyle, innerRef, ...restProps } = props;
  return (
    <div
      {...restProps}
      ref={innerRef}
      style={nativeStyle}
      className={`view ${css([props.className, props.style])}`}
    />
  );
};

export default View;
