import React, { type ReactNode } from 'react';

import { type CSSProperties } from './styles';
import { View } from './View';

type SpaceBetweenProps = {
  direction?: 'horizontal' | 'vertical';
  gap?: number;
  style?: CSSProperties;
  children: ReactNode;
};

export const SpaceBetween = ({
  direction = 'horizontal',
  gap = 15,
  style,
  children,
}: SpaceBetweenProps) => {
  return (
    <View
      style={{
        flexWrap: 'wrap',
        flexDirection: direction === 'horizontal' ? 'row' : 'column',
        alignItems: 'center',
        gap,
        ...style,
      }}
    >
      {children}
    </View>
  );
};
