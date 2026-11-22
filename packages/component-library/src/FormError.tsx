import type { CSSProperties, ReactNode } from 'react';

import { theme } from './theme';
import { View } from './View';

type FormErrorProps = {
  style?: CSSProperties;
  children?: ReactNode;
};

export function FormError({ style, children }: FormErrorProps) {
  return (
    <View style={{ color: theme.errorText, fontSize: 13, ...style }}>
      {children}
    </View>
  );
}
