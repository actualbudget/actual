import React, { type ReactNode } from 'react';

import { colors } from '../../style';
import { Row } from '../table';

import RenderMonths from './RenderMonths';
import SidebarGroup from './SidebarGroup';

type IncomeGroupProps = {
  group: { id: string; name: string };
  editingCell: { id: string; cell: string };
  collapsed: boolean;
  MonthComponent?: ReactNode;
  onEditName: (id: string) => void;
  onSave: () => void;
  onToggleCollapse: (id: string) => void;
  onShowNewCategory: (id: string) => void;
};

function IncomeGroup({
  group,
  editingCell,
  collapsed,
  MonthComponent,
  onEditName,
  onSave,
  onToggleCollapse,
  onShowNewCategory,
}: IncomeGroupProps) {
  return (
    <Row
      collapsed={true}
      style={{ fontWeight: 600, backgroundColor: colors.n11 }}
    >
      <SidebarGroup
        group={group}
        collapsed={collapsed}
        editing={
          editingCell &&
          editingCell.cell === 'name' &&
          editingCell.id === group.id
        }
        onEdit={onEditName}
        onSave={onSave}
        onToggleCollapse={onToggleCollapse}
        onShowNewCategory={onShowNewCategory}
        dragPreview={undefined}
        innerRef={undefined}
        style={undefined}
        onDelete={undefined}
        onHideNewGroup={undefined}
      />
      <RenderMonths
        component={MonthComponent}
        args={{ group }}
        editingIndex={undefined}
        style={undefined}
      />
    </Row>
  );
}

export default IncomeGroup;
