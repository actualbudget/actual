import React, { type ComponentType, type ReactNode } from 'react';

import type { CSSProperties } from 'glamor';

import ExclamationOutline from '../icons/v1/ExclamationOutline';
import InformationOutline from '../icons/v1/InformationOutline';
import { styles, colors } from '../style';

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
      style={[
        {
          color,
          fontSize: 13,
          ...styles.shadow,
          borderRadius: 4,
          backgroundColor,
          padding: 10,
          flexDirection: 'row',
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

type ScopedAlertProps = {
  style?: CSSProperties;
  children?: ReactNode;
};

export const Information = ({ style, children }: ScopedAlertProps) => {
  return (
    <Alert
      icon={InformationOutline}
      color={colors.noticeText}
      backgroundColor={colors.noticeBackground}
      style={[style, { boxShadow: 'none', padding: 5 }]}
    >
      {children}
    </Alert>
  );
};

export const Warning = ({ style, children }: ScopedAlertProps) => {
  return (
    <Alert
      icon={ExclamationOutline}
      color={colors.warningText}
      backgroundColor={colors.warningBackground}
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
      color={colors.errorText}
      backgroundColor={colors.errorBackground}
      style={style}
    >
      {children}
    </Alert>
  );
};
