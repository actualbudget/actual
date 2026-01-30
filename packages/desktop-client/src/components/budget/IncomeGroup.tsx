// @ts-strict-ignore
import React from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type CategoryGroupEntity } from 'loot-core/types/models';

import { CURRENCY_COLUMN_WIDTH } from './constants';
import { RenderMonths } from './RenderMonths';
import { SidebarGroup } from './SidebarGroup';

import { useBudgetComponents } from '.';

import { Row, ROW_HEIGHT } from '@desktop-client/components/table';
import { useOnBudgetCurrencies } from '@desktop-client/hooks/useOnBudgetCurrencies';
import { useShowCurrencyColumn } from '@desktop-client/hooks/useShowCurrencyColumn';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

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
  const showCurrencyColumn = useShowCurrencyColumn();
  const currencies = useOnBudgetCurrencies();
  const [enableMultiCurrencyOnBudget] = useSyncedPref(
    'enableMultiCurrencyOnBudget',
  );
  const showMultiCurrency =
    enableMultiCurrencyOnBudget === 'true' && currencies.length > 1;

  // Calculate row height: if multi-currency, one row per currency, otherwise single row
  const rowHeight = showMultiCurrency
    ? currencies.length * ROW_HEIGHT
    : ROW_HEIGHT;

  return (
    <Row
      collapsed
      height={rowHeight}
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
      {showCurrencyColumn && (
        <View
          style={{
            width: CURRENCY_COLUMN_WIDTH,
            flexShrink: 0,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: theme.tableBorder,
          }}
        />
      )}
      <RenderMonths>
        {({ month }) => <MonthComponent month={month} group={group} />}
      </RenderMonths>
    </Row>
  );
}
