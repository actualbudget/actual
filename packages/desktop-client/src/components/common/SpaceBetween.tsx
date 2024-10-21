import React, { type CSSProperties, type ReactNode } from 'react';

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
