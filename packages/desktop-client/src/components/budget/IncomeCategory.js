import React from 'react';

import { useDraggable, useDroppable, DropHighlight } from '../sort';
import { Row } from '../table';

import RenderMonths from './RenderMonths';
import SidebarCategory from './SidebarCategory';

function IncomeCategory({
  cat,
  isLast,
  editingCell,
  MonthComponent,
  onEditName,
  onEditMonth,
  onSave,
  onDelete,
  onDragChange,
  onBudgetAction,
  onReorder,
  onShowActivity,
}) {
  let { dragRef } = useDraggable({
    type: 'income-category',
    onDragChange,
    item: cat,
    canDrag: editingCell === null,
  });

  let { dropRef, dropPos } = useDroppable({
    types: 'income-category',
    id: cat.id,
    onDrop: onReorder,
  });

  return (
    <Row innerRef={dropRef} collapsed={true}>
      <DropHighlight pos={dropPos} offset={{ top: 1 }} />

      <SidebarCategory
        innerRef={dragRef}
        category={cat}
        isLast={isLast}
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
        editingIndex={
          editingCell && editingCell.id === cat.id && editingCell.cell
        }
        args={{
          category: cat,
          onEdit: onEditMonth,
          isLast,
          onShowActivity,
          onBudgetAction,
        }}
      />
    </Row>
  );
}

export default IncomeCategory;
