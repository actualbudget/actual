import React, { type ComponentProps } from 'react';

import { theme } from '../../style';
import View from '../common/View';
import {
  useDraggable,
  useDroppable,
  DropHighlight,
  type OnDragChangeCallback,
  type OnDropCallback,
  type DragState,
} from '../sort';
import { Row, ROW_HEIGHT } from '../table';

import RenderMonths from './RenderMonths';
import SidebarGroup from './SidebarGroup';

type ExpenseGroupProps = {
  group: ComponentProps<typeof SidebarGroup>['group'];
  collapsed: boolean;
  editingCell: { id: string; cell: string } | null;
  dragState: DragState<ComponentProps<typeof SidebarGroup>['group']>;
  MonthComponent: ComponentProps<typeof RenderMonths>['component'];
  onEditName?: ComponentProps<typeof SidebarGroup>['onEdit'];
  onSave?: ComponentProps<typeof SidebarGroup>['onSave'];
  onDelete?: ComponentProps<typeof SidebarGroup>['onDelete'];
  onDragChange: OnDragChangeCallback<
    ComponentProps<typeof SidebarGroup>['group']
  >;
  onReorderGroup: OnDropCallback;
  onReorderCategory: OnDropCallback;
  onToggleCollapse?: ComponentProps<typeof SidebarGroup>['onToggleCollapse'];
  onShowNewCategory?: ComponentProps<typeof SidebarGroup>['onShowNewCategory'];
};

function ExpenseGroup({
  group,
  collapsed,
  editingCell,
  dragState,
  MonthComponent,
  onEditName,
  onSave,
  onDelete,
  onDragChange,
  onReorderGroup,
  onReorderCategory,
  onToggleCollapse,
  onShowNewCategory,
}: ExpenseGroupProps) {
  let dragging = dragState && dragState.item === group;

  let { dragRef } = useDraggable({
    type: 'group',
    onDragChange,
    item: group,
    canDrag: editingCell === null,
  });

  let { dropRef, dropPos } = useDroppable({
    types: 'group',
    id: group.id,
    onDrop: onReorderGroup,
  });

  let { dropRef: catDropRef, dropPos: catDropPos } = useDroppable({
    types: 'category',
    id: group.id,
    onDrop: onReorderCategory,
    onLongHover: () => {
      if (collapsed) {
        onToggleCollapse(group.id);
      }
    },
  });

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
          innerRef={dragRef}
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
          onShowNewCategory={onShowNewCategory}
        />
        <RenderMonths component={MonthComponent} args={{ group }} />
      </View>
    </Row>
  );
}

export default ExpenseGroup;
