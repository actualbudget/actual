import React, {
  type MouseEventHandler,
  type ReactNode,
  type ComponentProps,
} from 'react';

import { type CSSProperties } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';

import { Link } from '@desktop-client/components/common/Link';

type ItemContentProps = {
  style: ComponentProps<typeof View>['style'];
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
    <Link variant="internal" to={to} style={style} activeStyle={activeStyle}>
      {children}
    </Link>
  );
}
