// @ts-strict-ignore
import React, { type ComponentProps } from 'react';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { theme } from '../../style';
import { View } from '../common/View';
import { Row } from '../table';

import { RenderMonths } from './RenderMonths';
import { SidebarGroup } from './SidebarGroup';

type ExpenseGroupProps = {
  group: ComponentProps<typeof SidebarGroup>['group'];
  collapsed: boolean;
  editingCell: { id: string; cell: string } | null;
  MonthComponent: ComponentProps<typeof RenderMonths>['component'];
  onEditName?: ComponentProps<typeof SidebarGroup>['onEdit'];
  onSave?: ComponentProps<typeof SidebarGroup>['onSave'];
  onDelete?: ComponentProps<typeof SidebarGroup>['onDelete'];
  onToggleCollapse?: ComponentProps<typeof SidebarGroup>['onToggleCollapse'];
  onShowNewCategory?: ComponentProps<typeof SidebarGroup>['onShowNewCategory'];
};

export function ExpenseGroup({
  group,
  collapsed,
  editingCell,
  MonthComponent,
  onEditName,
  onSave,
  onDelete,
  onToggleCollapse,
  onShowNewCategory,
}: ExpenseGroupProps) {
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: group.id, disabled: !!editingCell });

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
        fontWeight: 600,
        opacity: group.hidden ? 0.33 : undefined,
        backgroundColor: theme.tableRowHeaderBackground,
        ...dndStyle,
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
        }}
      >
        <SidebarGroup
          {...attributes}
          {...listeners}
          dragPreview={isDragging}
          group={group}
          editing={
            editingCell &&
            editingCell.cell === 'name' &&
            editingCell.id === group.id
          }
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
          onEdit={onEditName}
          onSave={onSave}
          onDelete={onDelete}
          onShowNewCategory={onShowNewCategory}
        />
        <RenderMonths component={MonthComponent} args={{ group }} />
      </View>
    </Row>
  );
}
