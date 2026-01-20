import { type CSSProperties, type ReactNode } from 'react';

import { View } from './View';

type FormErrorProps = {
  style?: CSSProperties;
  children?: ReactNode;
};

export function FormError({ style, children }: FormErrorProps) {
  return (
    <View style={{ color: 'red', fontSize: 13, ...style }}>{children}</View>
  );
}
