import React from 'react';

import { type CategoryGroupEntity } from 'loot-core/types/models/category-group';

import { theme } from '../../style/theme';
import { type CSSProperties } from '../../style/types';

export type ItemHeaderProps = {
  title: string;
  style?: CSSProperties;
  type?: string;
  item?: CategoryGroupEntity;
};

export function ItemHeader({
  title,
  style,
  type,
  item,
  ...props
}: ItemHeaderProps) {
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
      {item?.hidden ? ' (hidden)' : null}
    </div>
  );
}
