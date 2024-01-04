import React, { type MouseEventHandler, type ReactNode } from 'react';

import { type CSSProperties } from '../../style';
import { AnchorLink } from '../common/AnchorLink';
import { View } from '../common/View';

type ItemContentProps = {
  style: CSSProperties;
  to: string;
  onClick: MouseEventHandler<HTMLDivElement>;
  activeStyle: CSSProperties;
  children: ReactNode;
  forceActive?: boolean;
};

export function ItemContent({
  style,
  to,
  onClick,
  activeStyle,
  forceActive,
  children,
}: ItemContentProps) {
  return onClick ? (
    <View
      role="button"
      tabIndex={0}
      style={{
        ...style,
        touchAction: 'auto',
        userSelect: 'none',
        userDrag: 'none',
        cursor: 'pointer',
        ...(forceActive ? activeStyle : {}),
      }}
      onClick={onClick}
    >
      {children}
    </View>
  ) : (
    <AnchorLink to={to} style={style} activeStyle={activeStyle}>
      {children}
    </AnchorLink>
  );
}
