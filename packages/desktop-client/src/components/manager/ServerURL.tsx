import React from 'react';

import { Link } from '../common/Link';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { useServerURL } from '../ServerContext';

export function ServerURL() {
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
        zIndex: 5000,
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
      <Link variant="internal" to="/config-server" style={{ marginLeft: 15 }}>
        Change
      </Link>
    </View>
  );
}
