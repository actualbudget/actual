import { type HTMLProps, type Ref } from 'react';

import { css } from 'glamor';

import { type CSSProperties } from '../../style';

type BlockProps = HTMLProps<HTMLDivElement> & {
  innerRef?: Ref<HTMLDivElement>;
  style?: CSSProperties;
};

export function Block(props: BlockProps) {
  const { className = '', style, innerRef, ...restProps } = props;
  return (
    <div
      {...restProps}
      ref={innerRef}
      className={`${className} ${css(style)}`}
    />
  );
}
