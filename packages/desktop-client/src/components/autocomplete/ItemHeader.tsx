import React from 'react';

import { theme } from '../../style/theme';
import { type CSSProperties } from '../../style/types';


export type ItemHeaderProps = {
  title: string;
  style?: CSSProperties;
};

export function ItemHeader({
  title,
  style,
  ...props
}: ItemHeaderProps) {
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
