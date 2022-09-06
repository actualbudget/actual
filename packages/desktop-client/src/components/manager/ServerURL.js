import React from 'react';

import { View, Text, AnchorLink } from 'loot-design/src/components/common';

import { useServerURL } from '../../hooks/useServerURL';

export default function ServerURL() {
  const url = useServerURL();

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'center',
        flexDirection: 'row',
        marginBottom: 15,
        zIndex: 5000
      }}
    >
      <Text>
        {url ? (
          <>
            Using server: <strong>{url}</strong>
          </>
        ) : (
          <strong>No server configured</strong>
        )}
      </Text>
      <AnchorLink bare to="/config-server" style={{ marginLeft: 15 }}>
        Change
      </AnchorLink>
    </View>
  );
}
