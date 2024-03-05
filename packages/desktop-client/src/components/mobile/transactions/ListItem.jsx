import React, { forwardRef } from 'react';

import { View } from '../../common/View';

const ROW_HEIGHT = 50;

export const ListItem = forwardRef(({ children, style, ...props }, ref) => {
  return (
    <View
      style={{
        height: ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 10,
        paddingRight: 10,
        ...style,
      }}
      ref={ref}
      {...props}
    >
      {children}
    </View>
  );
});

ListItem.displayName = 'ListItem';
