import * as React from 'react';
import { StatusBar } from 'react-native';

import { useIsFocused } from 'mobile/node_modules/@react-navigation/native';

export default function FocusAwareStatusBar(props) {
  const isFocused = useIsFocused();
  return isFocused ? <StatusBar {...props} /> : null;
}
