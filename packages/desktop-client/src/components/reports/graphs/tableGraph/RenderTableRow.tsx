import React, { type ReactNode } from 'react';

import { type GroupedEntity } from 'loot-core/src/types/models/reports';

import { type CSSProperties } from '../../../../style';
import { View } from '../../../common/View';

import { type renderRowProps } from './ReportTable';

type RenderTableRowProps = {
  index: number;
  parent_index?: number;
  renderRow: (arg: renderRowProps) => ReactNode;
  mode: string;
  metadata: GroupedEntity[];
  style?: CSSProperties;
};

export function RenderTableRow({
  index,
  parent_index,
  renderRow,
  mode,
  metadata,
  style,
}: RenderTableRowProps) {
  const child = metadata[index];
  const parent =
    parent_index !== undefined ? metadata[parent_index] : ({} as GroupedEntity);

  const item =
    parent_index === undefined
      ? child
      : (parent.categories && parent.categories[index]) ||
        ({} as GroupedEntity);

  return (
    <View>
      {renderRow({
        item,
        mode,
        style,
      })}
    </View>
  );
}
