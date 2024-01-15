// @ts-strict-ignore
import React, { useRef, type ReactNode } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';

import { type CSSProperties } from '../../style';
import { View } from '../common/View';

type ContainerProps = {
  style?: CSSProperties;
  children: (width: number, height: number, host: HTMLDivElement) => ReactNode;
};
export function Container({ style, children }: ContainerProps) {
  const portalHost = useRef<HTMLDivElement>(null);

  return (
    <View
      style={{ height: 300, position: 'relative', flexShrink: 0, ...style }}
    >
      <div ref={portalHost} />
      <AutoSizer>
        {({ width, height }) => (
          <div style={{ width, height }}>
            {children(width, height, portalHost.current)}
          </div>
        )}
      </AutoSizer>
    </View>
  );
}
