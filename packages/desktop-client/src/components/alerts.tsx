import React, { type ComponentType, type ReactNode } from 'react';

import ExclamationOutline from '../icons/v1/ExclamationOutline';
import InformationOutline from '../icons/v1/InformationOutline';
import { styles, theme, type CSSProperties } from '../style';

import Text from './common/Text';
import View from './common/View';

type AlertProps = {
  icon?: ComponentType<{ width?: number; style?: CSSProperties }>;
  color?: string;
  backgroundColor?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

const Alert = ({
  icon: Icon,
  color,
  backgroundColor,
  style,
  children,
}: AlertProps) => {
  return (
    <View
      style={{
        color,
        fontSize: 13,
        ...styles.shadow,
        borderRadius: 4,
        backgroundColor,
        padding: 10,
        flexDirection: 'row',
        '& a, & a:active, & a:visited': {
          color: theme.altFormLabelText,
        },
        ...style,
      }}
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
        <Icon width={13} style={{ marginTop: 2 }} />
      </View>
      <Text style={{ zIndex: 1, lineHeight: 1.5 }}>{children}</Text>
    </View>
  );
};

type ScopedAlertProps = {
  style?: CSSProperties;
  children?: ReactNode;
};

export const Information = ({ style, children }: ScopedAlertProps) => {
  return (
    <Alert
      icon={InformationOutline}
      color={theme.pageTextLight}
      backgroundColor="transparent"
      style={{
        ...style,
        boxShadow: 'none',
        padding: 5,
      }}
    >
      {children}
    </Alert>
  );
};

export const Warning = ({ style, children }: ScopedAlertProps) => {
  return (
    <Alert
      icon={ExclamationOutline}
      color={theme.warningText}
      backgroundColor={theme.warningBackground}
      style={style}
    >
      {children}
    </Alert>
  );
};

export const Error = ({ style, children }: ScopedAlertProps) => {
  return (
    <Alert
      icon={ExclamationOutline}
      color={theme.altErrorText}
      backgroundColor={theme.altErrorBackground}
      style={style}
    >
      {children}
    </Alert>
  );
};
