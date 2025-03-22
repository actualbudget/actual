import React, { type ComponentPropsWithoutRef } from 'react';
import {
  Row as ReactAriaRow,
  Cell as ReactAriaCell,
} from 'react-aria-components';

import type { CategoryGroupEntity } from 'loot-core/types/models';

import { useSyncedPref } from '../../hooks/useSyncedPref';

import {
  type ColumnDefinition,
  getCategoryGroupRowStyle,
} from './BudgetCategoriesV2';
import { CategoryGroupBalanceCell } from './CategoryGroupBalanceCell';
import { CategoryGroupBudgetedCell } from './CategoryGroupBudgetedCell';
import { CategoryGroupNameCell } from './CategoryGroupNameCell';

type IncomeGroupRowProps = ComponentPropsWithoutRef<
  typeof ReactAriaRow<ColumnDefinition>
> & {
  item: {
    type: 'income-group';
    id: `income-group-${string}`;
    value: CategoryGroupEntity;
  };
  isCollapsed: boolean;
  onToggleCollapse: (categoryGroup: CategoryGroupEntity) => void;
  onAddCategory: (categoryGroup: CategoryGroupEntity) => void;
  onRename: (categoryGroup: CategoryGroupEntity, newName: string) => void;
  onDelete: (categoryGroup: CategoryGroupEntity) => void;
  onToggleVisibilty: (categoryGroup: CategoryGroupEntity) => void;
  onApplyBudgetTemplatesInGroup: (categoryGroup: CategoryGroupEntity) => void;
};
export function IncomeGroupRow({
  item,
  isCollapsed,
  onToggleCollapse,
  onAddCategory,
  onRename,
  onDelete,
  onToggleVisibilty,
  onApplyBudgetTemplatesInGroup,
  style,
  ...props
}: IncomeGroupRowProps) {
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');

  return budgetType === 'rollover' ? (
    <ReactAriaRow
      style={{
        ...getCategoryGroupRowStyle(item.value),
        ...style,
      }}
      {...props}
    >
      {column => {
        switch (column.type) {
          case 'category':
            return (
              <CategoryGroupNameCell
                month={column.month}
                categoryGroup={item.value}
                isCollapsed={isCollapsed}
                onToggleCollapse={onToggleCollapse}
                onAddCategory={onAddCategory}
                onRename={onRename}
                onDelete={onDelete}
                onToggleVisibilty={onToggleVisibilty}
                onApplyBudgetTemplatesInGroup={onApplyBudgetTemplatesInGroup}
              />
            );
          case 'budgeted':
            return <ReactAriaCell />;
          case 'spent':
            return <ReactAriaCell />;
          case 'balance':
            return (
              <CategoryGroupBalanceCell
                month={column.month}
                categoryGroup={item.value}
              />
            );
          default:
            throw new Error(`Unrecognized column type: ${column.type}`);
        }
      }}
    </ReactAriaRow>
  ) : (
    <ReactAriaRow
      style={{
        ...getCategoryGroupRowStyle(item.value),
        ...style,
      }}
      {...props}
    >
      {column => {
        switch (column.type) {
          case 'category':
            return (
              <CategoryGroupNameCell
                month={column.month}
                categoryGroup={item.value}
                isCollapsed={isCollapsed}
                onToggleCollapse={onToggleCollapse}
                onAddCategory={onAddCategory}
                onRename={onRename}
                onDelete={onDelete}
                onToggleVisibilty={onToggleVisibilty}
                onApplyBudgetTemplatesInGroup={onApplyBudgetTemplatesInGroup}
              />
            );
          case 'budgeted':
            return (
              <CategoryGroupBudgetedCell
                month={column.month}
                categoryGroup={item.value}
              />
            );
          case 'spent':
            return <ReactAriaCell />;
          case 'balance':
            return (
              <CategoryGroupBalanceCell
                month={column.month}
                categoryGroup={item.value}
              />
            );
          default:
            throw new Error(`Unrecognized column type: ${column.type}`);
        }
      }}
    </ReactAriaRow>
  );
}
