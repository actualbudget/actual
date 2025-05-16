// @ts-strict-ignore
import React, { type ComponentProps } from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  type CategoryGroupEntity,
  type CategoryEntity,
} from 'loot-core/types/models';

import { RenderMonths } from './RenderMonths';
import { SidebarCategory } from './SidebarCategory';

import {
  useDraggable,
  useDroppable,
  DropHighlight,
  type DragState,
  type OnDragChangeCallback,
  type OnDropCallback,
} from '@desktop-client/components/sort';
import { Row } from '@desktop-client/components/table';
import { useDragRef } from '@desktop-client/hooks/useDragRef';

type ExpenseCategoryProps = {
  cat: CategoryEntity;
  categoryGroup?: CategoryGroupEntity;
  editingCell: { id: string; cell: string } | null;
  dragState: DragState<CategoryEntity>;
  MonthComponent: ComponentProps<typeof RenderMonths>['component'];
  onEditName?: ComponentProps<typeof SidebarCategory>['onEditName'];
  onEditMonth?: (id: string, month: string) => void;
  onSave?: ComponentProps<typeof SidebarCategory>['onSave'];
  onDelete?: ComponentProps<typeof SidebarCategory>['onDelete'];
  onDragChange: OnDragChangeCallback<CategoryEntity>;
  onBudgetAction: (month: number, action: string, arg: unknown) => void;
  onShowActivity: (id: string, month: string) => void;
  onReorder: OnDropCallback;
};

export function ExpenseCategory({
  cat,
  categoryGroup,
  editingCell,
  dragState,
  MonthComponent,
  onEditName,
  onEditMonth,
  onSave,
  onDelete,
  onBudgetAction,
  onShowActivity,
  onDragChange,
  onReorder,
}: ExpenseCategoryProps) {
  let dragging = dragState && dragState.item === cat;

  if (dragState && dragState.item.id === cat.group) {
    dragging = true;
  }

  const { dragRef } = useDraggable({
    type: 'category',
    onDragChange,
    item: cat,
    canDrag: editingCell === null,
  });
  const handleDragRef = useDragRef(dragRef);

  const { dropRef, dropPos } = useDroppable({
    types: 'category',
    id: cat.id,
    onDrop: onReorder,
  });

  return (
    <Row
      innerRef={dropRef}
      collapsed={true}
      style={{
        backgroundColor: theme.tableBackground,
        opacity: cat.hidden || categoryGroup?.hidden ? 0.5 : undefined,
      }}
    >
      <DropHighlight pos={dropPos} offset={{ top: 1 }} />

      <View style={{ flex: 1, flexDirection: 'row' }}>
        <SidebarCategory
          innerRef={handleDragRef}
          category={cat}
          categoryGroup={categoryGroup}
          dragPreview={dragging && dragState.preview}
          dragging={dragging && !dragState.preview}
          editing={
            editingCell &&
            editingCell.cell === 'name' &&
            editingCell.id === cat.id
          }
          onEditName={onEditName}
          onSave={onSave}
          onDelete={onDelete}
        />

        <RenderMonths
          component={MonthComponent}
          editingMonth={
            editingCell && editingCell.id === cat.id && editingCell.cell
          }
          args={{
            category: cat,
            onEdit: onEditMonth,
            onBudgetAction,
            onShowActivity,
          }}
        />
      </View>
    </Row>
  );
}
