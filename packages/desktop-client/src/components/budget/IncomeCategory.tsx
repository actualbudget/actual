// @ts-strict-ignore
import React, { type ComponentProps } from 'react';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { type CategoryEntity } from 'loot-core/src/types/models';

import { Row } from '../table';

import { RenderMonths } from './RenderMonths';
import { SidebarCategory } from './SidebarCategory';

type IncomeCategoryProps = {
  cat: CategoryEntity;
  isLast?: boolean;
  editingCell: { id: string; cell: string } | null;
  MonthComponent: ComponentProps<typeof RenderMonths>['component'];
  onEditName: ComponentProps<typeof SidebarCategory>['onEditName'];
  onEditMonth?: (id: string, monthIndex: number) => void;
  onSave: ComponentProps<typeof SidebarCategory>['onSave'];
  onDelete: ComponentProps<typeof SidebarCategory>['onDelete'];
  onBudgetAction: (idx: number, action: string, arg: unknown) => void;
  onShowActivity: (name: string, id: string, idx: number) => void;
};

export function IncomeCategory({
  cat,
  isLast,
  editingCell,
  MonthComponent,
  onEditName,
  onEditMonth,
  onSave,
  onDelete,
  onBudgetAction,
  onShowActivity,
}: IncomeCategoryProps) {
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: cat.id, disabled: !!editingCell });

  const dndStyle = {
    opacity: isDragging ? 0.5 : undefined,
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Row innerRef={setNodeRef} collapsed={true} style={dndStyle}>
      <SidebarCategory
        {...attributes}
        {...listeners}
        dragPreview={isDragging}
        dragging={isDragging}
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
