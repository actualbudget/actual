import { type ReactNode, type CSSProperties } from 'react';

import { View } from '@actual-app/components/view';

type FormErrorProps = {
  style?: CSSProperties;
  children?: ReactNode;
};

export function FormError({ style, children }: FormErrorProps) {
  return (
    <View style={{ color: 'red', fontSize: 13, ...style }}>{children}</View>
  );
}
