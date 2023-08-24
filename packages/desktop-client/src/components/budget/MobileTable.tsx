import React, { type ReactNode, type CSSProperties } from 'react';

import { colors } from '../../style';
import View from '../common/View';

export const ROW_HEIGHT = 50;

type ListItemProps = {
  children?: ReactNode;
  style: CSSProperties;
};

export const ListItem = ({ children, style, ...props }: ListItemProps) => {
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
