// @ts-strict-ignore
import React, { useRef } from 'react';
import type { CSSProperties } from 'react';

import { View } from '@actual-app/components/view';

import type { DashboardPageEntity } from 'loot-core/types/models';

import { SecondaryItem } from './SecondaryItem';

import {
  DropHighlight,
  useDraggable,
  useDroppable,
} from '@desktop-client/components/sort';
import type {
  OnDragChangeCallback,
  OnDropCallback,
} from '@desktop-client/components/sort';
import { useDragRef } from '@desktop-client/hooks/useDragRef';

type ReportProps = {
  name: string;
  to: string;
  dashboardPage?: DashboardPageEntity;
  style?: CSSProperties;
  outerStyle?: CSSProperties;
  onDragChange?: OnDragChangeCallback<{ id: string }>;
  onDrop?: OnDropCallback;
};

export function Report({
  name,
  dashboardPage,
  to,
  style,
  outerStyle,
  onDragChange,
  onDrop,
}: ReportProps) {
  const triggerRef = useRef(null);

  const { dragRef } = useDraggable({
    type: 'report',
    onDragChange,
    item: { id: dashboardPage && dashboardPage.id },
    canDrag: true,
  });
  const handleDragRef = useDragRef(dragRef);

  const { dropRef, dropPos } = useDroppable({
    types: ['report'],
    id: dashboardPage && dashboardPage.id,
    onDrop,
  });

  return (
    <View innerRef={dropRef} style={{ flexShrink: 0, ...outerStyle }}>
      <View innerRef={triggerRef}>
        <DropHighlight pos={dropPos} />
        <View innerRef={handleDragRef}>
          <SecondaryItem title={name} indent={15} to={to} style={style} />
        </View>
      </View>
    </View>
  );
}
