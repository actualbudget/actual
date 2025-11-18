import React, { type ReactNode } from 'react';

import { type CSSProperties } from './styles';
import { View } from './View';

type SpaceBetweenProps = {
  direction?: 'horizontal' | 'vertical';
  gap?: number;
  wrap?: boolean;
  align?: 'start' | 'center' | 'end' | 'stretch';
  style?: CSSProperties;
  children: ReactNode;
};

export const SpaceBetween = ({
  direction = 'horizontal',
  gap = 15,
  wrap = true,
  align = 'center',
  style,
  children,
  ...props
}: SpaceBetweenProps) => {
  return (
    <View
      style={{
        flexWrap: wrap ? 'wrap' : 'nowrap',
        flexDirection: direction === 'horizontal' ? 'row' : 'column',
        alignItems: align,
        gap,
        ...style,
      }}
      {...props}
    >
      {children}
    </View>
  );
};
