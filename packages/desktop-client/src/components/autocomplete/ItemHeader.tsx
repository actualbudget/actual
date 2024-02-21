import React from 'react';

import { theme } from '../../style/theme';
import { type CSSProperties } from '../../style/types';

export type ItemHeaderProps = {
  title: string;
  style?: CSSProperties;
  type?: string;
};

export function ItemHeader({ title, style, type, ...props }: ItemHeaderProps) {
  return (
    <div
      style={{
        color: theme.menuAutoCompleteTextHeader,
        padding: '4px 9px',
        ...style,
      }}
      data-testid={`${title}-${type}-item-group`}
      {...props}
    >
      {title}
    </div>
  );
}
