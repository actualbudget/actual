import React from 'react';

import { useResponsive } from '../../ResponsiveProvider';
import { styles, theme } from '../../style';
import { type CSSProperties } from '../../style/types';

type ItemHeaderProps = {
  title: string;
  style?: CSSProperties;
  type?: string;
};

export function ItemHeader({ title, style, type, ...props }: ItemHeaderProps) {
  const { isNarrowWidth } = useResponsive();
  const narrowStyle = isNarrowWidth
    ? {
        ...styles.largeText,
        color: theme.menuItemTextHeader,
        paddingTop: 10,
        paddingBottom: 10,
      }
    : {};

  return (
    <div
      style={{
        color: theme.menuAutoCompleteTextHeader,
        padding: '4px 9px',
        ...narrowStyle,
        ...style,
      }}
      data-testid={`${title}-${type}-item-group`}
      {...props}
    >
      {title}
    </div>
  );
}
