import React from 'react';
import type { ReactNode } from 'react';

import { View } from './View';
import type { CSSProperties } from './styles';

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
