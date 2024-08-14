// @ts-strict-ignore
import React, {
  type ComponentType,
  type MouseEventHandler,
  type ReactNode,
  type SVGProps,
} from 'react';

import { styles, theme, type CSSProperties } from '../../style';
import { Block } from '../common/Block';
import { View } from '../common/View';

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
  };

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 20,
      }}
    >
      <Icon width={15} height={15} />
      <Block style={{ marginLeft: 8 }}>{title}</Block>
      <View style={{ flex: 1 }} />
    </View>
  );

  return (
    <View style={{ flexShrink: 0, ...style }}>
      <ItemContent
        style={({ isHovered, isPressed }) => ({
          ...styles.mediumText,
          paddingTop: 9,
          paddingBottom: 9,
          paddingLeft: 19 + indent,
          paddingRight: 10,
          textDecoration: 'none',
          color: theme.sidebarItemText,
          ...(isHovered || forceHover ? hoverStyle : {}),
          ...(isPressed || forceActive
            ? {
                borderLeft: '4px solid ' + theme.sidebarItemTextSelected,
                paddingLeft: 19 + indent - 4,
                color: theme.sidebarItemTextSelected,
              }
            : {}),
        })}
        to={to}
        onClick={onClick}
      >
        {content}
      </ItemContent>
      {children ? <View style={{ marginTop: 5 }}>{children}</View> : null}
    </View>
  );
}
