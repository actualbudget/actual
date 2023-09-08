import React from 'react';

import View from '../common/View';
import { useDraggable, useDroppable, DropHighlight } from '../sort';
import { Row } from '../table';

import RenderMonths from './RenderMonths';
import SidebarCategory from './SidebarCategory';

function ExpenseCategory({
  cat,
  budgetArray,
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
}) {
  let dragging = dragState && dragState.item === cat;

  if (dragState && dragState.item.id === cat.cat_group) {
    dragging = true;
  }

  let { dragRef } = useDraggable({
    type: 'category',
    onDragChange,
    item: cat,
    canDrag: editingCell === null,
  });

  let { dropRef, dropPos } = useDroppable({
    types: 'category',
    id: cat.id,
    onDrop: onReorder,
  });

  return (
    <Row
      innerRef={dropRef}
      collapsed={true}
      style={{
        backgroundColor: 'transparent',
        opacity: cat.hidden ? 0.5 : undefined,
      }}
    >
      <DropHighlight pos={dropPos} offset={{ top: 1 }} />

      <View style={{ flex: 1, flexDirection: 'row' }}>
        <SidebarCategory
          innerRef={dragRef}
          category={cat}
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
          onDragChange={onDragChange}
        />

        <RenderMonths
          component={MonthComponent}
          editingIndex={
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

export default ExpenseCategory;
