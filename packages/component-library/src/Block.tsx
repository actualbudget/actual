import type { HTMLProps, Ref } from 'react';

import { css, cx } from '@emotion/css';

import type { CSSProperties } from './styles';

type BlockProps = Omit<HTMLProps<HTMLDivElement>, 'style'> & {
  innerRef?: Ref<HTMLDivElement>;
  style?: CSSProperties;
};

export function Block(props: BlockProps) {
  const { className = '', style, innerRef, ...restProps } = props;
  return (
    <div {...restProps} ref={innerRef} className={cx(className, css(style))} />
  );
}
