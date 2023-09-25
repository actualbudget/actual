import React, { type ComponentProps } from 'react';

import { theme } from '../../style';
import { Row } from '../table';

import RenderMonths from './RenderMonths';
import SidebarGroup from './SidebarGroup';

type IncomeGroupProps = {
  group: {
    id: string;
    hidden: number;
    categories: object[];
    is_income: number;
    name: string;
    sort_order: number;
    tombstone: number;
  };
  editingCell: { id: string; cell: string } | null;
  collapsed: boolean;
  MonthComponent: () => JSX.Element;
  onEditName: (id: string) => void;
  onSave: (group: object) => Promise<void>;
  onToggleCollapse: (id: string) => void;
  onShowNewCategory: (groupId: string) => void;
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
  console.log('group', group);
  console.log('editing cell', editingCell);
  console.log('collapsed', collapsed);
  console.log('MonthComponent', MonthComponent);
  console.log('onEditName', onEditName);
  console.log('onSave', onSave);
  console.log('onToggleCollapse', onToggleCollapse);
  console.log('onShowNewCategory', onShowNewCategory);

  return (
    <Row
      collapsed={true}
      style={{ fontWeight: 600, backgroundColor: theme.altTableBackground }}
    >
      <SidebarGroup
        group={group}
        collapsed={collapsed}
        editing={editingCell &&
          editingCell.cell === 'name' &&
          editingCell.id === group.id}
        onEdit={onEditName}
        onSave={onSave}
        onToggleCollapse={onToggleCollapse}
        onShowNewCategory={onShowNewCategory} dragPreview={undefined} innerRef={undefined} style={undefined} onDelete={undefined} onHideNewGroup={undefined}      />
      <RenderMonths component={MonthComponent} args={{ group }} />
    </Row>
  );
}

export default IncomeGroup;
