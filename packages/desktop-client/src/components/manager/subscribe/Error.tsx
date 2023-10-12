import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { theme } from '../../../style';
import Button from '../../common/Button';
import Text from '../../common/Text';
import View from '../../common/View';

function getErrorMessage(reason) {
  switch (reason) {
    case 'network-failure':
      return 'Unable to access server. Make sure the configured URL for the server is accessible.';
    default:
      return 'Server returned an error while checking its status.';
  }
}

export default function Error() {
  let navigate = useNavigate();
  let location = useLocation();
  let { error } = (location.state || {}) as { error? };

  function onTryAgain() {
    navigate('/');
  }

  return (
    <View style={{ alignItems: 'center', color: theme.pageText }}>
      <Text
        style={{
          fontSize: 16,
          color: theme.pageTextDark,
          lineHeight: 1.4,
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
