import React, { createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import { useResponsive } from '../ResponsiveProvider';
import { colors, styles } from '../style';

import { Modal, View, Text } from './common';

let PageTypeContext = createContext({ type: 'page' });

function PageTitle({ name, style }) {
  const { isNarrowWidth } = useResponsive();

  if (isNarrowWidth) {
    return (
      <View
        style={[
          {
            alignItems: 'center',
            backgroundColor: colors.b2,
            color: 'white',
            flexDirection: 'row',
            flex: '1 0 auto',
            fontSize: 18,
            fontWeight: 500,
            height: 50,
            justifyContent: 'center',
            overflowY: 'auto',
          },
          style,
        ]}
      >
        {name}
      </View>
    );
  }

  return (
    <Text
      style={[
        {
          fontSize: 25,
          fontWeight: 500,
          marginBottom: 15,
        },
        style,
      ]}
    >
      {name}
    </Text>
  );
}

export function Page({ title, children, titleStyle }) {
  let { isNarrowWidth } = useResponsive();
  let HORIZONTAL_PADDING = isNarrowWidth ? 10 : 20;

  return (
    <View style={isNarrowWidth ? undefined : styles.page}>
      <PageTitle
        name={title}
        style={{
          ...titleStyle,
          paddingInline: HORIZONTAL_PADDING,
        }}
      />
      <View
        style={
          isNarrowWidth
            ? { overflowY: 'auto', padding: HORIZONTAL_PADDING }
            : {
                paddingLeft: HORIZONTAL_PADDING,
                paddingRight: HORIZONTAL_PADDING,
                flex: 1,
              }
        }
      >
        {children}
      </View>
    </View>
  );
}
