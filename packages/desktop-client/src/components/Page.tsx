import React, { type ReactNode } from 'react';

import { useResponsive } from '../ResponsiveProvider';
import { theme, styles, type CSSProperties } from '../style';

import Text from './common/Text';
import View from './common/View';

type PageHeaderProps = {
  name: ReactNode;
  style?: CSSProperties;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
};

const HEADER_HEIGHT = 50;

function PageHeader({
  name,
  style,
  leftContent,
  rightContent,
}: PageHeaderProps) {
  const { isNarrowWidth } = useResponsive();

  if (isNarrowWidth) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.mobilePageBackground,
          color: theme.mobileModalText,
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
          }}
        >
          {name}
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
      {name}
    </Text>
  );
}

type PageProps = {
  title: ReactNode;
  titleStyle?: CSSProperties;
  headerLeftContent?: ReactNode;
  headerRightContent?: ReactNode;
  children: ReactNode;
};

export function Page({
  title,
  titleStyle,
  headerLeftContent,
  headerRightContent,
  children,
}: PageProps) {
  let { isNarrowWidth } = useResponsive();
  let HORIZONTAL_PADDING = isNarrowWidth ? 10 : 20;

  return (
    <View style={isNarrowWidth ? undefined : styles.page}>
      <PageHeader
        name={title}
        leftContent={headerLeftContent}
        rightContent={headerRightContent}
        style={{
          ...titleStyle,
          ...(!isNarrowWidth && { paddingInline: HORIZONTAL_PADDING }),
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
