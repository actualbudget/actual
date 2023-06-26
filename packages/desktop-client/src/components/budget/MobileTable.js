import React from 'react';

import { colors } from '../../style';
import { View } from '../common';

export let ROW_HEIGHT = 50;

export let ListItem = ({ children, style, ...props }) => {
  return (
    <View
      style={[
        {
          height: ROW_HEIGHT,
          borderBottomWidth: 1,
          borderColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 10,
          paddingRight: 10,
          zIndex: 1,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};
