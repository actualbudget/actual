import React, { type ComponentPropsWithoutRef } from 'react';
import { Row as ReactAriaRow } from 'react-aria-components';

import type { CategoryGroupEntity } from 'loot-core/types/models';

import {
  type ColumnDefinition,
  getCategoryGroupRowStyle,
  getHeaderBackgroundStyle,
} from './BudgetCategoriesV2';
import { CategoryGroupBalanceCell } from './CategoryGroupBalanceCell';
import { CategoryGroupBudgetedCell } from './CategoryGroupBudgetedCell';
import { CategoryGroupNameCell } from './CategoryGroupNameCell';
import { CategoryGroupSpentCell } from './CategoryGroupSpentCell';

type ExpenseGroupRowProps = ComponentPropsWithoutRef<
  typeof ReactAriaRow<ColumnDefinition>
> & {
  item: {
    type: 'expense-group';
    id: `expense-group-${string}`;
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
export function ExpenseGroupRow({
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
}: ExpenseGroupRowProps) {
  return (
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
                style={getHeaderBackgroundStyle(column.type, column.month)}
              />
            );
          case 'spent':
            return (
              <CategoryGroupSpentCell
                month={column.month}
                categoryGroup={item.value}
                style={getHeaderBackgroundStyle(column.type, column.month)}
              />
            );
          case 'balance':
            return (
              <CategoryGroupBalanceCell
                month={column.month}
                categoryGroup={item.value}
                style={getHeaderBackgroundStyle(column.type, column.month)}
              />
            );
          default:
            throw new Error(`Unrecognized column type: ${column.type}`);
        }
      }}
    </ReactAriaRow>
  );
}
