// @ts-strict-ignore
import type {
  ComponentProps,
  ComponentType,
  CSSProperties,
  SVGProps,
} from 'react';
import React from 'react';

import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { accountNameStyle } from './Account';
import { ItemContent } from './ItemContent';

const fontWeight = 600;

type SecondaryItemProps = {
  title: string;
  to?: string;
  Icon?:
    | ComponentType<SVGProps<SVGElement>>
    | ComponentType<SVGProps<SVGSVGElement>>;
  style?: CSSProperties;
  onClick?: ComponentProps<typeof ItemContent>['onClick'];
  bold?: boolean;
  indent?: number;
  testId?: string;
};

export function SecondaryItem({
  Icon,
  title,
  style,
  to,
  onClick,
  bold,
  indent = 0,
  testId,
}: SecondaryItemProps) {
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 16,
      }}
    >
      {Icon && <Icon width={12} height={12} aria-hidden focusable={false} />}
      <Block style={{ marginLeft: Icon ? 8 : 0, color: 'inherit' }}>
        {title}
      </Block>
    </View>
  );

  return (
    <View style={{ flexShrink: 0, ...style }} data-testid={testId}>
      <ItemContent
        style={{
          ...accountNameStyle,
          color: theme.sidebarItemText,
          paddingLeft: 14 + indent,
          fontWeight: bold ? fontWeight : null,
          ':hover': { backgroundColor: theme.sidebarItemBackgroundHover },
        }}
        to={to}
        onClick={onClick}
        activeStyle={{
          borderLeft: '4px solid ' + theme.sidebarItemTextSelected,
          paddingLeft: 14 - 4 + indent,
          color: theme.sidebarItemTextSelected,
          fontWeight: bold ? fontWeight : null,
        }}
      >
        {content}
      </ItemContent>
    </View>
  );
}
