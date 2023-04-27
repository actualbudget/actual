import React from 'react';

import type { CSSProperties } from 'glamor';

import ExclamationOutline from '../icons/v1/ExclamationOutline';
import InformationOutline from '../icons/v1/InformationOutline';
import { styles, colors } from '../style';

import Text from './common/Text';
import View from './common/View';

interface AlertProps {
  icon?: React.FC<{ width?: number; style?: CSSProperties }>;
  color?: string;
  backgroundColor?: string;
  style?: CSSProperties;
  children?: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({
  icon: Icon,
  color,
  backgroundColor,
  style,
  children,
}) => {
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
};

interface ScopedAlertProps {
  style?: CSSProperties;
  children?: React.ReactNode;
}

export const Information: React.FC<ScopedAlertProps> = ({
  style,
  children,
}) => {
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
};

export const Warning: React.FC<ScopedAlertProps> = ({ style, children }) => {
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
};

export const Error: React.FC<ScopedAlertProps> = ({ style, children }) => {
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
};
