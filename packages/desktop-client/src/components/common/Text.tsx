import React, { type Ref, type ReactNode } from 'react';

import { css } from 'glamor';

import { type HTMLPropsWithStyle } from '../../types/utils';

type TextProps = HTMLPropsWithStyle<HTMLSpanElement> & {
  innerRef?: Ref<HTMLSpanElement>;
  className?: string;
  children?: ReactNode;
};

const Text = (props: TextProps) => {
  const { style, innerRef, ...restProps } = props;
  return (
    <span
      {...restProps}
      ref={innerRef}
      className={String(css([props.className, props.style]))}
    />
  );
};

export default Text;
