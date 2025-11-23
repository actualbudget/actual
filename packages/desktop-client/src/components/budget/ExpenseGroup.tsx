// @ts-strict-ignore
import React, { type ComponentProps } from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';

import { RenderMonths } from './RenderMonths';
import { SidebarGroup } from './SidebarGroup';

import { useBudgetComponents } from '.';

import {
  useDraggable,
  useDroppable,
  DropHighlight,
  type OnDragChangeCallback,
  type OnDropCallback,
  type DragState,
} from '@desktop-client/components/sort';
import { Row, ROW_HEIGHT } from '@desktop-client/components/table';
import { useDragRef } from '@desktop-client/hooks/useDragRef';

type ExpenseGroupProps = {
  group: ComponentProps<typeof SidebarGroup>['group'];
  collapsed: boolean;
  editingCell: { id: string; cell: string } | null;
  dragState: DragState<CategoryEntity> | DragState<CategoryGroupEntity> | null;
  onEditName?: ComponentProps<typeof SidebarGroup>['onEdit'];
  onSave?: ComponentProps<typeof SidebarGroup>['onSave'];
  onDelete?: ComponentProps<typeof SidebarGroup>['onDelete'];
  onApplyBudgetTemplatesInGroup?: ComponentProps<
    typeof SidebarGroup
  >['onApplyBudgetTemplatesInGroup'];
  onDragChange: OnDragChangeCallback<
    ComponentProps<typeof SidebarGroup>['group']
  >;
  onReorderGroup: OnDropCallback;
  onReorderCategory: OnDropCallback;
  onToggleCollapse?: ComponentProps<typeof SidebarGroup>['onToggleCollapse'];
  onShowNewCategory?: ComponentProps<typeof SidebarGroup>['onShowNewCategory'];
};

export function ExpenseGroup({
  group,
  collapsed,
  editingCell,
  dragState,
  onEditName,
  onSave,
  onDelete,
  onApplyBudgetTemplatesInGroup,
  onDragChange,
  onReorderGroup,
  onReorderCategory,
  onToggleCollapse,
  onShowNewCategory,
}: ExpenseGroupProps) {
  const dragging = dragState && dragState.item === group;

  const { dragRef } = useDraggable({
    type: 'group',
    onDragChange,
    item: group,
    canDrag: editingCell === null,
  });
  const handleDragRef = useDragRef(dragRef);

  const { dropRef, dropPos } = useDroppable({
    types: 'group',
    id: group.id,
    onDrop: onReorderGroup,
  });

  const { dropRef: catDropRef, dropPos: catDropPos } = useDroppable({
    types: 'category',
    id: group.id,
    onDrop: onReorderCategory,
    onLongHover: () => {
      if (collapsed) {
        onToggleCollapse(group.id);
      }
    },
  });

  const { ExpenseGroupComponent: MonthComponent } = useBudgetComponents();

  return (
    <Row
      collapsed={true}
      style={{
        fontWeight: 600,
        opacity: group.hidden ? 0.33 : undefined,
        backgroundColor: theme.tableRowHeaderBackground,
      }}
    >
      {dragState && !dragState.preview && dragState.type === 'group' && (
        <View
          innerRef={dropRef}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: collapsed
              ? ROW_HEIGHT - 1
              : (1 + group.categories.length) * (ROW_HEIGHT - 1) + 1,
            zIndex: 10000,
          }}
        >
          <DropHighlight pos={dropPos} offset={{ top: 1 }} />
        </View>
      )}

      <DropHighlight pos={catDropPos} offset={{ top: 1 }} />

      <View
        innerRef={catDropRef}
        style={{
          flex: 1,
          flexDirection: 'row',
          opacity: dragging && !dragState.preview ? 0.3 : 1,
        }}
      >
        <SidebarGroup
          innerRef={handleDragRef}
          group={group}
          editing={
            editingCell &&
            editingCell.cell === 'name' &&
            editingCell.id === group.id
          }
          dragPreview={dragging && dragState.preview}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
          onEdit={onEditName}
          onSave={onSave}
          onDelete={onDelete}
          onApplyBudgetTemplatesInGroup={onApplyBudgetTemplatesInGroup}
          onShowNewCategory={onShowNewCategory}
        />
        <RenderMonths>
          {({ month }) => <MonthComponent month={month} group={group} />}
        </RenderMonths>
      </View>
    </Row>
  );
}
