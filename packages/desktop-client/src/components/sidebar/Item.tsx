// @ts-strict-ignore
import React, {
  type ComponentType,
  type MouseEventHandler,
  type ReactNode,
  type SVGProps,
  type CSSProperties,
} from 'react';

import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { ItemContent } from './ItemContent';

type ItemProps = {
  title: string;
  Icon:
    | ComponentType<SVGProps<SVGElement>>
    | ComponentType<SVGProps<SVGSVGElement>>;
  to?: string;
  children?: ReactNode;
  style?: CSSProperties;
  indent?: number;
  onClick?: MouseEventHandler<HTMLDivElement>;
  forceHover?: boolean;
  forceActive?: boolean;
};

export function Item({
  children,
  Icon,
  title,
  style,
  to,
  onClick,
  indent = 0,
  forceHover = false,
  forceActive = false,
}: ItemProps) {
  const hoverStyle = {
    backgroundColor: theme.sidebarItemBackgroundHover,
    transform: 'translateX(2px)',
  };

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 22,
        gap: 10,
      }}
    >
      <View
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          borderRadius: 6,
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <Icon width={14} height={14} style={{ opacity: 0.8 }} />
      </View>
      <Block style={{ fontWeight: 500, letterSpacing: '-0.01em' }}>{title}</Block>
      <View style={{ flex: 1 }} />
    </View>
  );

  return (
    <View style={{ flexShrink: 0, ...style }}>
      <ItemContent
        style={{
          ...styles.mediumText,
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 16 + indent,
          paddingRight: 12,
          marginLeft: 0,
          marginRight: 0,
          marginBottom: 0,
          textDecoration: 'none',
          color: theme.sidebarItemText,
          transition:
            'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          ...(forceHover ? hoverStyle : {}),
          ':hover': hoverStyle,
        }}
        forceActive={forceActive}
        activeStyle={{
          backgroundColor: 'rgba(255, 107, 74, 0.08)',
          borderLeft: '3px solid ' + theme.sidebarItemAccentSelected,
          paddingLeft: 16 + indent - 3,
          color: theme.sidebarItemTextSelected,
          boxShadow: 'inset 0 0 0 1px rgba(255, 107, 74, 0.1)',
        }}
        to={to}
        onClick={onClick}
      >
        {content}
      </ItemContent>
      {children ? <View style={{ marginTop: 5 }}>{children}</View> : null}
    </View>
  );
}
