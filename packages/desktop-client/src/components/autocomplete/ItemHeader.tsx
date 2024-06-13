import React from 'react';

import { useResponsive } from '../../ResponsiveProvider';
import { styles, theme } from '../../style';
import { type CSSProperties } from '../../style/types';

type ItemHeaderProps = {
  title: string;
  style?: CSSProperties;
  type?: string;
  isGroupHeader?: boolean;
};

export function ItemHeader({
  title,
  style,
  type,
  isGroupHeader,
  ...props
}: ItemHeaderProps) {
  const { isNarrowWidth } = useResponsive();
  const narrowStyle = isNarrowWidth
    ? {
        ...styles.largeText,
        paddingTop: 10,
        paddingBottom: 10,
      }
    : {};

  return (
    <div
      style={{
        fontSize: isGroupHeader ? 11 : 'auto',
        fontWeight: isGroupHeader ? 500 : 'auto',
        opacity: isGroupHeader ? 0.7 : 'auto',
        color: isGroupHeader
          ? theme.noticeTextMenu
          : theme.menuAutoCompleteTextHeader,
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
