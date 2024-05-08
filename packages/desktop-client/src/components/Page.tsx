import React, { type ReactNode } from 'react';

import { useNavigate } from '../hooks/useNavigate';
import { SvgArrowLeft } from '../icons/v1';
import { useResponsive } from '../ResponsiveProvider';
import { theme, styles, type CSSProperties } from '../style';

import { Button } from './common/Button';
import { Text } from './common/Text';
import { View } from './common/View';

const HEADER_HEIGHT = 50;

type PageHeaderProps = {
  title: ReactNode;
  leftContent?: ReactNode;
  style?: CSSProperties;
};

export function PageHeader({ title, leftContent, style }: PageHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginBottom: 15,
        ...style,
      }}
    >
      {leftContent}
      <Text
        style={{
          fontSize: 25,
          fontWeight: 500,
          marginLeft: leftContent ? 5 : undefined,
        }}
      >
        {title}
      </Text>
    </View>
  );
}

export function PageBackButton({ onClick, ...props }) {
  const navigate = useNavigate();

  return (
    <Button type="bare" {...props} onClick={onClick || (() => navigate(-1))}>
      <SvgArrowLeft width={10} height={10} />
      <Text style={{ marginLeft: 5 }}>Back</Text>
    </Button>
  );
}

type MobilePageHeaderProps = {
  title: ReactNode;
  style?: CSSProperties;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
};

export function MobilePageHeader({
  title,
  style,
  leftContent,
  rightContent,
}: MobilePageHeaderProps) {
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
        role="heading"
        style={{
          textAlign: 'center',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          flexBasis: '50%',
          fontSize: 17,
          fontWeight: 500,
          overflowY: 'auto',
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

type PageProps = {
  header: string | ReactNode;
  style?: CSSProperties;
  padding?: number;
  children: ReactNode;
  footer?: ReactNode;
};

export function Page({ header, style, padding, children, footer }: PageProps) {
  const { isNarrowWidth } = useResponsive();
  const _padding = padding != null ? padding : isNarrowWidth ? 10 : 20;

  const headerToRender =
    typeof header === 'string' ? (
      isNarrowWidth ? (
        <MobilePageHeader title={header} />
      ) : (
        <PageHeader
          title={header}
          style={{
            paddingInline: _padding,
          }}
        />
      )
    ) : (
      header
    );

  return (
    <View
      style={{
        ...(!isNarrowWidth && styles.page),
        flex: 1,
        backgroundColor: isNarrowWidth
          ? theme.mobilePageBackground
          : theme.pageBackground,
        ...style,
      }}
    >
      {headerToRender}
      {isNarrowWidth ? (
        <View
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: _padding,
          }}
        >
          {children}
        </View>
      ) : (
        <View
          style={{
            flex: 1,
            paddingLeft: _padding,
            paddingRight: _padding,
          }}
        >
          {children}
        </View>
      )}
      {footer}
    </View>
  );
}
