import React, { type ComponentProps, type ReactNode } from 'react';

import { type CSSProperties, theme } from '../../../style';
import { View } from '../../common/View';

export const ROW_HEIGHT = 50;

type ListItemProps = ComponentProps<typeof View> & {
  children?: ReactNode;
  style: CSSProperties;
};

export const ListItem = ({ children, style, ...props }: ListItemProps) => {
  return (
    <View
      style={{
        height: ROW_HEIGHT,
        borderBottomWidth: 1,
        borderColor: theme.tableBorder,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 10,
        paddingRight: 10,
        zIndex: 1,
        ...style,
      }}
      {...props}
    >
      {children}
    </View>
  );
};
