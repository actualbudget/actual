import React, { type CSSProperties } from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';

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
