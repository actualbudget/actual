import React from 'react';

import ExclamationOutline from '../icons/v1/ExclamationOutline';
import InformationOutline from '../icons/v1/InformationOutline';
import { styles, colors } from '../style';

import { View, Text } from './common';

export function Alert({ icon: Icon, color, backgroundColor, style, children }) {
  return (
    <View
      style={[
        {
          color,
          fontSize: 13,
          ...styles.shadow,
          borderRadius: 4,
          backgroundColor,
          padding: 10,
          flexDirection: 'row',
          '& a, & a:active, & a:visited': {
            color: colors.b3,
          },
        },
        style,
      ]}
    >
      <View
        style={{
          paddingLeft: 2,
          paddingTop: '.11em',
          alignSelf: 'stretch',
          flexShrink: 0,
          marginRight: 5,
        }}
      >
        <Icon width={13} style={{ color, marginTop: 2 }} />
      </View>
      <Text style={{ zIndex: 1, lineHeight: 1.5 }}>{children}</Text>
    </View>
  );
}

export function Information({ style, children }) {
  return (
    <Alert
      icon={InformationOutline}
      color={colors.n4}
      backgroundColor="transparent"
      style={[style, { boxShadow: 'none', padding: 5 }]}
    >
      {children}
    </Alert>
  );
}

export function Warning({ style, children }) {
  return (
    <Alert
      icon={ExclamationOutline}
      color={colors.y2}
      backgroundColor={colors.y10}
      style={style}
    >
      {children}
    </Alert>
  );
}

export function Error({ style, children }) {
  return (
    <Alert
      icon={ExclamationOutline}
      color={colors.r2}
      backgroundColor={colors.r10}
      style={style}
    >
      {children}
    </Alert>
  );
}
