import type { CSSProperties, ReactNode } from 'react';

import { View } from '@actual-app/components/view';

type GridProps = {
  columns: number;
  gap?: number;
  style?: CSSProperties;
  children: ReactNode;
};

export function Grid({ columns, gap = 4, style, children }: GridProps) {
  return (
    <View
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap,
        ...style,
      }}
    >
      {children}
    </View>
  );
}
