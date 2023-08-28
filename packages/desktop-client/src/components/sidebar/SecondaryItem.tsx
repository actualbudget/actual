import React, {
  type CSSProperties,
  type ComponentType,
  type MouseEventHandler,
  type SVGProps,
} from 'react';

import { theme } from '../../style';
import Block from '../common/Block';
import View from '../common/View';

import { accountNameStyle } from './Account';
import ItemContent from './ItemContent';

const fontWeight = 600;

type SecondaryItemProps = {
  title: string;
  to?: string;
  Icon?: ComponentType<SVGProps<SVGElement>>;
  style?: CSSProperties;
  onClick?: MouseEventHandler<HTMLDivElement>;
  bold?: boolean;
  indent?: number;
};

function SecondaryItem({
  Icon,
  title,
  style,
  to,
  onClick,
  bold,
  indent = 0,
}: SecondaryItemProps) {
  const hoverStyle = {
    backgroundColor: theme.sidebarItemBackgroundHover,
  };
  const activeStyle = {
    color: theme.sidebarItemTextSelected,
    borderLeft: '4px solid ' + theme.sidebarItemAccentSelected,
    paddingLeft: 14 - 4 + indent,
    fontWeight: bold ? fontWeight : null,
  };
  const linkStyle = {
    ...accountNameStyle,
    color: theme.sidebarItemText,
    paddingLeft: 14 + indent,
    fontWeight: bold ? fontWeight : null,
    ':hover': hoverStyle,
  };

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 16,
      }}
    >
      {Icon && <Icon width={12} height={12} />}
      <Block style={{ marginLeft: Icon ? 8 : 0, color: 'inherit' }}>
        {title}
      </Block>
    </View>
  );

  return (
    <View style={[{ flexShrink: 0 }, style]}>
      <ItemContent
        style={linkStyle}
        to={to}
        onClick={onClick}
        activeStyle={activeStyle}
      >
        {content}
      </ItemContent>
    </View>
  );
}

export default SecondaryItem;
