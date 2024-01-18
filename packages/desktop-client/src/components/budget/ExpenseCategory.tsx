// @ts-strict-ignore
import React, { type ComponentProps } from 'react';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { type CategoryEntity } from 'loot-core/src/types/models';

import { theme } from '../../style';
import { View } from '../common/View';
import { Row } from '../table';

import { RenderMonths } from './RenderMonths';
import { SidebarCategory } from './SidebarCategory';

type ExpenseCategoryProps = {
  cat: CategoryEntity;
  editingCell: { id: string; cell: string } | null;
  MonthComponent: ComponentProps<typeof RenderMonths>['component'];
  onEditName?: ComponentProps<typeof SidebarCategory>['onEditName'];
  onEditMonth?: (id: string, monthIndex: number) => void;
  onSave?: ComponentProps<typeof SidebarCategory>['onSave'];
  onDelete?: ComponentProps<typeof SidebarCategory>['onDelete'];
  onBudgetAction: (idx: number, action: string, arg: unknown) => void;
  onShowActivity: (name: string, id: string, idx: number) => void;
};

export function ExpenseCategory({
  cat,
  editingCell,
  MonthComponent,
  onEditName,
  onEditMonth,
  onSave,
  onDelete,
  onBudgetAction,
  onShowActivity,
}: ExpenseCategoryProps) {
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
    <Row
      innerRef={setNodeRef}
      collapsed={true}
      style={{
        backgroundColor: theme.tableBackground,
        opacity: cat.hidden ? 0.5 : undefined,
        ...dndStyle,
      }}
    >
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <SidebarCategory
          {...attributes}
          {...listeners}
          dragPreview={isDragging}
          dragging={isDragging}
          category={cat}
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
            onBudgetAction,
            onShowActivity,
          }}
        />
      </View>
    </Row>
  );
}
