import { type ReactNode } from 'react';

import { type CSSProperties } from 'glamor';

import View from './View';

type FormErrorProps = {
  style?: CSSProperties;
  children?: ReactNode;
};

export default function FormError({ style, children }: FormErrorProps) {
  return (
    <View style={[{ color: 'red', fontSize: 13 }, style]}>{children}</View>
  );
}
