import React from 'react';
import { View } from 'react-native';

import Platform from 'loot-core/src/client/platform';

import { colors } from '../../style';

export const ROW_HEIGHT = 50;

export const ListItem = React.forwardRef(
  ({ children, style, ...props }, ref) => {
    return (
      <View
        style={[
          {
            height: ROW_HEIGHT,
            borderBottomWidth: 1,
            borderColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 10,
            zIndex: 1
          },
          // This makes it work the same on the web as RN. Looks
          // like react native web does the wrong thing here.
          Platform.isReactNativeWeb && {
            flexBasis: 'inherit'
          },
          style
        ]}
        ref={ref}
        {...props}
      >
        {children}
      </View>
    );
  }
);
