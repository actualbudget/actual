import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '#components/common/Modal';
import { DropHighlight, useDraggable, useDroppable } from '#components/sort';
import type { DragState, OnDropCallback } from '#components/sort';
import { useDragRef } from '#hooks/useDragRef';
import { useFocusedViews, BUILT_IN_VIEWS } from '#hooks/useFocusedViews';

type ReorderViewsModalProps = {
  onClose: () => void;
};

type ViewItem = {
  id: string;
  name: string;
  isBuiltIn: boolean;
};

type SortableViewItemProps = {
  item: ViewItem;
  dragState: DragState<ViewItem> | null;
  onDragChange: (drag: DragState<ViewItem>) => void;
  onReorder: OnDropCallback;
};

function SortableViewItem({ item, dragState, onDragChange, onReorder }: SortableViewItemProps) {
  const dragging = dragState?.item?.id === item.id;

  const { dragRef } = useDraggable({
    type: 'view',
    onDragChange,
    item,
    canDrag: true,
  });
  const handleDragRef = useDragRef(dragRef);

  const { dropRef, dropPos } = useDroppable({
    types: 'view',
    id: item.id,
    onDrop: onReorder,
  });

  return (
    <View
      innerRef={dropRef}
      style={{
        padding: '10px',
        backgroundColor: dragging ? theme.tableRowBackgroundHighlight : theme.tableBackground,
        borderBottom: '1px solid ' + theme.tableBorder,
        position: 'relative',
        cursor: 'grab',
      }}
    >
      <DropHighlight pos={dropPos} offset={{ top: 1 }} />
      <View
        innerRef={handleDragRef}
        style={{ flexDirection: 'row', alignItems: 'center' }}
      >
        <View style={{ flex: 1, userSelect: 'none' }}>
          {item.name}
        </View>
        <View style={{ color: theme.pageTextSubdued, fontSize: 12 }}>
          {item.isBuiltIn ? 'Standard' : 'Custom'}
        </View>
      </View>
    </View>
  );
}

export function ReorderViewsModal({ onClose }: ReorderViewsModalProps) {
  const { t } = useTranslation();
  const {
    views,
    viewOrder,
    reorderViewToTarget
  } = useFocusedViews();

  const [dragState, setDragState] = useState<DragState<ViewItem> | null>(null);

  const allItems: ViewItem[] = useMemo(() => {
    return viewOrder.map(id => {
      const isBuiltIn = Object.values(BUILT_IN_VIEWS).includes(id as any);
      let name = '';
      if (isBuiltIn) {
        switch (id) {
          case BUILT_IN_VIEWS.OVERSPENT: name = t('Overspent'); break;
          case BUILT_IN_VIEWS.UNDERFUNDED: name = t('Underfunded'); break;
          case BUILT_IN_VIEWS.OVERFUNDED: name = t('Overfunded'); break;
          case BUILT_IN_VIEWS.MONEY_AVAILABLE: name = t('Money Available'); break;
        }
      } else {
        const customView = views.find(v => v.id === id);
        name = customView?.name || 'Unknown View';
      }
      return { id, name, isBuiltIn };
    });
  }, [viewOrder, views, t]);

  const onReorder: OnDropCallback = (id, dropPos, targetId) => {
    reorderViewToTarget(id, dropPos, targetId);
  };

  return (
    <Modal name="reorder-views-editor" onClose={onClose}>
      <ModalHeader
        title={<ModalTitle title={t('Reorder Views')} shrinkOnOverflow />}
        rightContent={<ModalCloseButton onPress={onClose} />}
      />

      <View style={{ padding: 15, flex: 1, overflowY: 'auto', maxHeight: '60vh' }}>
        <View style={{ border: '1px solid ' + theme.tableBorder, borderRadius: 4, overflow: 'hidden' }}>
          {allItems.map(item => (
            <SortableViewItem
              key={item.id}
              item={item}
              dragState={dragState}
              onDragChange={setDragState}
              onReorder={onReorder}
            />
          ))}
        </View>
      </View>
    </Modal>
  );
}
