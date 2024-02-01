import React, { type ComponentPropsWithoutRef, type ReactNode } from 'react';

import { useResponsive } from '../ResponsiveProvider';
import { theme, styles, type CSSProperties } from '../style';

import { Text } from './common/Text';
import { View } from './common/View';

type PageHeaderProps = {
  title: ReactNode;
  titleContainerProps?: ComponentPropsWithoutRef<typeof View>;
  style?: CSSProperties;
  leftContentContainerProps?: ComponentPropsWithoutRef<typeof View>;
  leftContent?: ReactNode;
  rightContentContainerProps?: ComponentPropsWithoutRef<typeof View>;
  rightContent?: ReactNode;
};

const HEADER_HEIGHT = 50;

function PageHeader({
  title,
  titleContainerProps,
  style,
  leftContentContainerProps,
  leftContent,
  rightContentContainerProps,
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
          {...leftContentContainerProps}
          style={{
            flexBasis: '25%',
            justifyContent: 'flex-start',
            flexDirection: 'row',
            ...leftContentContainerProps?.style,
          }}
        >
          {leftContent}
        </View>
        <View
          role="heading"
          {...titleContainerProps}
          style={{
            textAlign: 'center',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            flexBasis: '50%',
            fontSize: 17,
            fontWeight: 500,
            overflowY: 'auto',
            ...titleContainerProps?.style,
          }}
        >
          {title}
        </View>
        <View
          {...rightContentContainerProps}
          style={{
            flexBasis: '25%',
            justifyContent: 'flex-end',
            flexDirection: 'row',
            ...rightContentContainerProps?.style,
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
  titleContainerProps?: PageHeaderProps['titleContainerProps'];
  title: PageHeaderProps['title'];
  headerStyle?: CSSProperties;
  headerLeftContentContainerProps?: PageHeaderProps['leftContentContainerProps'];
  headerLeftContent?: PageHeaderProps['leftContent'];
  headerRightContentContainerProps?: PageHeaderProps['rightContentContainerProps'];
  headerRightContent?: PageHeaderProps['rightContent'];
  style?: CSSProperties;
  padding?: number;
  childrenContainerProps?: ComponentPropsWithoutRef<typeof View>;
  children: ReactNode;
  footer?: ReactNode;
};

export function Page({
  titleContainerProps,
  title,
  headerStyle,
  headerLeftContentContainerProps,
  headerLeftContent,
  headerRightContentContainerProps,
  headerRightContent,
  style,
  padding,
  childrenContainerProps,
  children,
  footer,
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
        titleContainerProps={titleContainerProps}
        leftContentContainerProps={headerLeftContentContainerProps}
        leftContent={headerLeftContent}
        rightContentContainerProps={headerRightContentContainerProps}
        rightContent={headerRightContent}
        style={{
          ...(!isNarrowWidth && { paddingInline: _padding }),
          ...headerStyle,
        }}
      />
      {isNarrowWidth ? (
        <View
          {...childrenContainerProps}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: _padding,
            ...childrenContainerProps?.style,
          }}
        >
          {children}
        </View>
      ) : (
        <View
          {...childrenContainerProps}
          style={{
            flex: 1,
            paddingLeft: _padding,
            paddingRight: _padding,
            ...childrenContainerProps?.style,
          }}
        >
          {children}
        </View>
      )}
      {footer}
    </View>
  );
}
