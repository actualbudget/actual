import React, { useRef } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';

import { View } from '../common';

export default function Container({ style, children }) {
  const portalHost = useRef(null);

  return (
    <View style={[{ height: 300, position: 'relative', flexShrink: 0 }, style]}>
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
