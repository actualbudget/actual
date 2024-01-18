// @ts-strict-ignore
import React from 'react';

import { type CategoryGroupEntity } from 'loot-core/src/types/models';

import { theme } from '../../style';
import { Row } from '../table';

import { RenderMonths } from './RenderMonths';
import { SidebarGroup } from './SidebarGroup';

type IncomeGroupProps = {
  group: CategoryGroupEntity;
  editingCell: { id: string; cell: string } | null;
  collapsed: boolean;
  MonthComponent: () => JSX.Element;
  onEditName: (id: string) => void;
  onSave: (group: object) => Promise<void>;
  onToggleCollapse: (id: string) => void;
  onShowNewCategory: (groupId: string) => void;
};

export function IncomeGroup({
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
      style={{
        fontWeight: 600,
        backgroundColor: theme.tableRowHeaderBackground,
      }}
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
      />
      <RenderMonths component={MonthComponent} args={{ group }} />
    </Row>
  );
}
