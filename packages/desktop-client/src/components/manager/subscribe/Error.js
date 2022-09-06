import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import { View, Text, Button } from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

function getErrorMessage(reason) {
  switch (reason) {
    case 'network-failure':
      return 'Unable to access server. Make sure the configured URL for the server is accessible.';
    default:
      return 'Server returned an error while checking its status.';
  }
}

export default function Error() {
  let history = useHistory();
  let location = useLocation();
  let { error } = location.state || {};

  function onTryAgain() {
    history.push('/');
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <Text
        style={{
          fontSize: 16,
          color: colors.n2,
          lineHeight: 1.4
        }}
      >
        {getErrorMessage(error)}
      </Text>
      <Button onClick={onTryAgain} style={{ marginTop: 20 }}>
        Try again
      </Button>
    </View>
  );
}
