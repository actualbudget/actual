import type { ComponentProps, ReactNode } from 'react';
import React from 'react';

import { Button } from '@actual-app/components/button';
import type { CSSProperties } from '@actual-app/components/styles';
import type { View } from '@actual-app/components/view';

import { Link } from '#components/common/Link';

type ItemContentProps = {
  style: ComponentProps<typeof View>['style'];
  to: string;
  onClick: ComponentProps<typeof Button>['onPress'];
  activeStyle: CSSProperties;
  children: ReactNode;
  forceActive?: boolean;
  buttonProps?: Pick<
    ComponentProps<typeof Button>,
    'aria-expanded' | 'aria-controls'
  >;
};

export function ItemContent({
  style,
  to,
  onClick,
  activeStyle,
  forceActive,
  children,
  buttonProps,
}: ItemContentProps) {
  return onClick ? (
    <Button
      variant="bare"
      {...buttonProps}
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
