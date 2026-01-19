import React, { type ComponentProps, type ReactNode } from 'react';

import { Button } from '@actual-app/components/button';
import { type CSSProperties } from '@actual-app/components/styles';
import { type View } from '@actual-app/components/view';

import { Link } from '@desktop-client/components/common/Link';

type ItemContentProps = {
  style: ComponentProps<typeof View>['style'];
  to: string;
  onClick: ComponentProps<typeof Button>['onPress'];
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
    <Button
      variant="bare"
      style={{
        justifyContent: 'flex-start',
        ...style,
        ...(forceActive ? activeStyle : {}),
      }}
      onPress={onClick}
    >
      {children}
    </Button>
  ) : (
    <Link variant="internal" to={to} style={style} activeStyle={activeStyle}>
      {children}
    </Link>
  );
}
