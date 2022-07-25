import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  AnchorLink,
  Button
} from 'loot-design/src/components/common';
import { send } from 'loot-core/src/platform/client/fetch';
import { colors } from 'loot-design/src/style';
import { useSetThemeColor } from 'loot-design/src/components/hooks';

export default function ServerURL() {
  let [url, setUrl] = useState(null);

  useSetThemeColor(colors.p5);

  useEffect(() => {
    async function run() {
      let url = await send('get-server-url');
      setUrl(url);
    }
    run();
  }, []);

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
        Using server: <strong>{url || '(not configured)'}</strong>
      </Text>
      <AnchorLink bare to="/config-server" style={{ marginLeft: 15 }}>
        Change
      </AnchorLink>
    </View>
  );
}
