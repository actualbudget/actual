import React, { useRef, type ReactNode, type CSSProperties } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';

import { View } from '../common/View';

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
      <AutoSizer>
        {({ width, height }: { width: number; height: number }) => (
          <div style={{ width, height }}>
            {children(width, height, portalHost.current)}
          </div>
        )}
      </AutoSizer>
    </View>
  );
}
