import { type Ref } from 'react';

import { css } from 'glamor';

import type { HTMLPropsWithStyle } from '../../types/utils';

type BlockProps = HTMLPropsWithStyle<HTMLDivElement> & {
  innerRef?: Ref<HTMLDivElement>;
};

export default function Block(props: BlockProps) {
  const { style, innerRef, ...restProps } = props;
  return (
    <div
      {...restProps}
      ref={innerRef}
      className={`${props.className || ''} ${css(props.style)}`}
    />
  );
}
