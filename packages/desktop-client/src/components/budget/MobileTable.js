import React from 'react';

import { View } from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

export const ROW_HEIGHT = 50;

export const ListItem = ({ children, style, ...props }) => {
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
          zIndex: 1
        },
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );
};
