import type { HTMLProps } from 'react';

export type HTMLPropsWithStyle<E> = Omit<HTMLProps<E>, 'style'> & {
  // glamor CSSProperties is any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  style?: any;
};
