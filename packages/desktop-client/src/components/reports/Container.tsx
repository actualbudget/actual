import React, { useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { AutoSizer } from 'react-virtualized-auto-sizer';

import { View } from '@actual-app/components/view';

type ContainerProps = {
  style?: CSSProperties;
  children: (
    width: number,
    height: number,
    host: HTMLDivElement | null,
  ) => ReactNode;
};
export function Container({ style, children }: ContainerProps) {
  const portalHost = useRef<HTMLDivElement>(null);

  return (
    <View
      style={{ height: 300, position: 'relative', flexShrink: 0, ...style }}
    >
      <div ref={portalHost} />
      <AutoSizer
        renderProp={({ width = 0, height = 0 }) => {
          if (width === 0 || height === 0) {
            return null;
          }

          return (
            <div style={{ width, height }}>
              {children(width, height, portalHost.current)}
            </div>
          );
        }}
      />
    </View>
  );
}
