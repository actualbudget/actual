import React, { type Ref, type StyleHTMLAttributes } from 'react';

import { css } from 'glamor';

import { type HTMLPropsWithStyle } from '../../types/utils';

type ViewProps = HTMLPropsWithStyle<HTMLDivElement> & {
  className?: string;
  nativeStyle?: StyleHTMLAttributes<HTMLDivElement>;
  innerRef?: Ref<HTMLDivElement>;
};

const View = (props: ViewProps) => {
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
