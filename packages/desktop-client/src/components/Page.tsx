import React, { type ReactNode } from 'react';

import { useResponsive } from '../ResponsiveProvider';
import { theme, styles, type CSSProperties } from '../style';

import Text from './common/Text';
import View from './common/View';

type PageHeaderProps = {
  title: ReactNode;
  style?: CSSProperties;
  titleStyle?: CSSProperties;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
};

const HEADER_HEIGHT = 50;

function PageHeader({
  title,
  style,
  titleStyle,
  leftContent,
  rightContent,
}: PageHeaderProps) {
  const { isNarrowWidth } = useResponsive();

  if (isNarrowWidth) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.mobileHeaderBackground,
          color: theme.mobileHeaderText,
          flexDirection: 'row',
          flexShrink: 0,
          height: HEADER_HEIGHT,
          ...style,
        }}
      >
        <View
          style={{
            flexBasis: '25%',
            justifyContent: 'flex-start',
            flexDirection: 'row',
          }}
        >
          {leftContent}
        </View>
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            flexBasis: '50%',
            fontSize: 18,
            fontWeight: 500,
            justifyContent: 'center',
            overflowY: 'auto',
            ...titleStyle,
          }}
        >
          {title}
        </View>
        <View
          style={{
            flexBasis: '25%',
            justifyContent: 'flex-end',
            flexDirection: 'row',
          }}
        >
          {rightContent}
        </View>
      </View>
    );
  }

  return (
    <Text
      style={{
        fontSize: 25,
        fontWeight: 500,
        marginBottom: 15,
        ...style,
      }}
    >
      {title}
    </Text>
  );
}

type PageProps = {
  title: ReactNode;
  titleStyle?: CSSProperties;
  headerStyle?: CSSProperties;
  headerLeftContent?: ReactNode;
  headerRightContent?: ReactNode;
  style?: CSSProperties;
  padding?: number;
  children: ReactNode;
};

export function Page({
  title,
  titleStyle,
  headerStyle,
  headerLeftContent,
  headerRightContent,
  style,
  padding,
  children,
}: PageProps) {
  const { isNarrowWidth } = useResponsive();
  const _padding = padding != null ? padding : isNarrowWidth ? 10 : 20;

  return (
    <View
      style={{
        ...(!isNarrowWidth && styles.page),
        ...style,
      }}
    >
      <PageHeader
        title={title}
        leftContent={headerLeftContent}
        rightContent={headerRightContent}
        style={{
          ...(!isNarrowWidth && { paddingInline: _padding }),
          ...headerStyle,
        }}
        titleStyle={titleStyle}
      />
      <View
        style={
          isNarrowWidth
            ? {
                overflowY: 'auto',
                padding: _padding,
              }
            : {
                flex: 1,
                paddingLeft: _padding,
                paddingRight: _padding,
              }
        }
      >
        {children}
      </View>
    </View>
  );
}
