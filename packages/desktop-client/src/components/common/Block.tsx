import { type HTMLProps, type Ref } from 'react';

import { css } from 'glamor';

type BlockProps = HTMLProps<HTMLDivElement> & {
  innerRef?: Ref<HTMLDivElement>;
};

export default function Block(props: BlockProps) {
  const { className = '', style, innerRef, ...restProps } = props;
  return (
    <div
      {...restProps}
      ref={innerRef}
      className={`${className} ${css(style)}`}
    />
  );
}
