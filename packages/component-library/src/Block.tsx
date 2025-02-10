import { type HTMLProps, type Ref } from 'react';

import { css, cx } from '@emotion/css';

import { type CSSProperties } from './styles';

type BlockProps = HTMLProps<HTMLDivElement> & {
  innerRef?: Ref<HTMLDivElement>;
  style?: CSSProperties;
};

export function Block(props: BlockProps) {
  const { className = '', style, innerRef, ...restProps } = props;
  return (
    <div {...restProps} ref={innerRef} className={cx(className, css(style))} />
  );
}
