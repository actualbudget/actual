// @ts-strict-ignore
import React from 'react';

import { theme } from '@actual-app/components/theme';

import { type CategoryGroupEntity } from 'loot-core/types/models';

import { RenderMonths } from './RenderMonths';
import { SidebarGroup } from './SidebarGroup';

import { useBudgetComponents } from '.';

import { Row } from '@desktop-client/components/table';

type IncomeGroupProps = {
  group: CategoryGroupEntity;
  editingCell: { id: CategoryGroupEntity['id']; cell: string } | null;
  collapsed: boolean;
  onEditName: (id: CategoryGroupEntity['id']) => void;
  onSave: (group: CategoryGroupEntity) => void;
  onToggleCollapse: (id: CategoryGroupEntity['id']) => void;
  onShowNewCategory: (groupId: CategoryGroupEntity['id']) => void;
};

export function IncomeGroup({
  group,
  editingCell,
  collapsed,
  onEditName,
  onSave,
  onToggleCollapse,
  onShowNewCategory,
}: IncomeGroupProps) {
  const { IncomeGroupComponent: MonthComponent } = useBudgetComponents();
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
      <RenderMonths>
        {({ month }) => <MonthComponent month={month} group={group} />}
      </RenderMonths>
    </Row>
  );
}
