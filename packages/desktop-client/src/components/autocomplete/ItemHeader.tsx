import React from 'react';

import { theme } from '../../style/theme';
import { type CSSProperties } from '../../style/types';

export function ItemHeader({
  title,
  style,
  ...props
}: {
  title: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        color: theme.menuAutoCompleteTextHeader,
        padding: '4px 9px',
        ...style,
      }}
      {...props}
    >
      {title}
    </div>
  );
}
