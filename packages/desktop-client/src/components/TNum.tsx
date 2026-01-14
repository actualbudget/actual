import React, { type ComponentPropsWithoutRef, type ElementType } from 'react';

import { type CSSProperties, styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';

type TNumProps<T extends ElementType = typeof Text> = {
  as?: T;
  style?: CSSProperties;
} & Omit<ComponentPropsWithoutRef<T>, 'style'>;

export function TNum<T extends ElementType = typeof Text>({
  as,
  style,
  ...props
}: TNumProps<T>) {
  const Component = as ?? Text;

  return <Component {...props} style={{ ...style, ...styles.tnum }} />;
}
