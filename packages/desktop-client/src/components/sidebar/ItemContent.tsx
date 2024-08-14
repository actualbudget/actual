import React, {
  type ComponentProps,
  type MouseEventHandler,
  type ReactNode,
} from 'react';

import { Link } from '../common/Link';
import { View } from '../common/View';

type ItemContentProps = {
  style: ComponentProps<typeof Link>['style'];
  to: string;
  onClick: MouseEventHandler<HTMLDivElement>;
  children: ReactNode;
};

export function ItemContent({
  style,
  to,
  onClick,
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
      }}
      onClick={onClick}
    >
      {children}
    </View>
  ) : (
    <Link to={to} style={style}>
      {children}
    </Link>
  );
}
