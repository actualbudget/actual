import React from 'react';
import type { ComponentType, CSSProperties, ReactNode } from 'react';

import {
  SvgExclamationOutline,
  SvgInformationOutline,
} from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

type AlertProps = {
  icon: ComponentType<{ width?: number; style?: CSSProperties }>;
  color?: string;
  backgroundColor?: string;
  style?: CSSProperties;
  iconStyle?: CSSProperties;
  children?: ReactNode;
};

const Alert = ({
  icon: Icon,
  color,
  backgroundColor,
  style,
  iconStyle,
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
          color: theme.formLabelText,
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
          ...iconStyle,
        }}
      >
        <Icon width={13} style={{ marginTop: 2 }} />
      </View>
      <Text style={{ width: '100%', zIndex: 1, lineHeight: 1.5 }}>
        {children}
      </Text>
    </View>
  );
};

type ScopedAlertProps = {
  style?: CSSProperties;
  iconStyle?: CSSProperties;
  children?: ReactNode;
};

export const Information = ({
  style,
  iconStyle,
  children,
}: ScopedAlertProps) => {
  return (
    <Alert
      icon={SvgInformationOutline}
      color={theme.pageTextLight}
      backgroundColor="transparent"
      style={{
        boxShadow: 'none',
        padding: 5,
        ...style,
      }}
      iconStyle={iconStyle}
    >
      {children}
    </Alert>
  );
};

export const Warning = ({ style, iconStyle, children }: ScopedAlertProps) => {
  return (
    <Alert
      icon={SvgExclamationOutline}
      color={theme.warningText}
      backgroundColor={theme.warningBackground}
      style={style}
      iconStyle={iconStyle}
    >
      {children}
    </Alert>
  );
};

export const Error = ({ style, iconStyle, children }: ScopedAlertProps) => {
  return (
    <Alert
      icon={SvgExclamationOutline}
      color={theme.errorTextDarker}
      backgroundColor={theme.errorBackground}
      style={style}
      iconStyle={iconStyle}
    >
      {children}
    </Alert>
  );
};
