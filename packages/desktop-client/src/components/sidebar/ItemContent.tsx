import React, {
  type MouseEventHandler,
  type ReactNode,
  type ComponentProps,
} from 'react';

import { type CSSProperties } from '@actual-app/components/styles';
import { type View } from '@actual-app/components/view';

import { Link } from '@desktop-client/components/common/Link';

type ItemContentProps = {
  style: ComponentProps<typeof View>['style'];
  to: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
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
    <button
      type="button"
      style={{
        ...style,
        touchAction: 'auto',
        userSelect: 'none',
        cursor: 'pointer',
        border: 'none',
        background: 'transparent',
        padding: 0,
        font: 'inherit',
        ...(forceActive ? activeStyle : {}),
      }}
      onClick={onClick}
    >
      {children}
    </button>
  ) : (
    <Link variant="internal" to={to} style={style} activeStyle={activeStyle}>
      {children}
    </Link>
  );
}
