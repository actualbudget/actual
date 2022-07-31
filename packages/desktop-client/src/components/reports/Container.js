import React from 'react';
import { View } from '@actual-app/loot-design/src/components/common';
import AutoSizer from 'react-virtualized-auto-sizer';

class Container extends React.Component {
  render() {
    const { style, children } = this.props;

    return (
      <View
        style={[{ height: 300, position: 'relative', flexShrink: 0 }, style]}
      >
        <div ref={el => (this.portalHost = el)} />
        <AutoSizer>
          {({ width, height }) => (
            <div style={{ width, height }}>
              {children(width, height, this.portalHost)}
            </div>
          )}
        </AutoSizer>
      </View>
    );
  }
}

export default Container;
