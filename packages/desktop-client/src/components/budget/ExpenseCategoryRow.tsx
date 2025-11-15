import React, { type ComponentPropsWithoutRef } from 'react';
import { Row as ReactAriaRow } from 'react-aria-components';

import type {
  CategoryEntity,
  CategoryGroupEntity,
} from 'loot-core/types/models';

import {
  type ColumnDefinition,
  getCategoryRowStyle,
  getCellBackgroundStyle,
} from './BudgetCategoriesV2';
import { CategoryBalanceCell } from './CategoryBalanceCell';
import { CategoryBudgetedCell } from './CategoryBudgetedCell';
import { CategoryNameCell } from './CategoryNameCell';
import { CategorySpentCell } from './CategorySpentCell';

type ExpenseCategoryRowProps = ComponentPropsWithoutRef<
  typeof ReactAriaRow<ColumnDefinition>
> & {
  item: {
    type: 'expense-category';
    id: `expense-category-${string}`;
    value: CategoryEntity;
    group: CategoryGroupEntity;
  };
  onBudgetAction: (month: string, action: string, args: unknown) => void;
  onShowActivity: (category: CategoryEntity, month: string) => void;
  onRename: (category: CategoryEntity, newName: string) => void;
  onDelete: (category: CategoryEntity) => void;
  onToggleVisibility: (category: CategoryEntity) => void;
};
export function ExpenseCategoryRow({
  item,
  onBudgetAction,
  onShowActivity,
  onRename,
  onDelete,
  onToggleVisibility,
  style,
  ...props
}: ExpenseCategoryRowProps) {
  return (
    <ReactAriaRow
      style={{
        ...getCategoryRowStyle(item.value, item.group),
        ...style,
      }}
      {...props}
    >
      {column => {
        switch (column.type) {
          case 'category':
            return (
              <CategoryNameCell
                month={column.month}
                category={item.value}
                categoryGroup={item.group}
                onRename={onRename}
                onDelete={onDelete}
                onToggleVisibility={onToggleVisibility}
              />
            );
          case 'budgeted':
            return (
              <CategoryBudgetedCell
                month={column.month}
                category={item.value}
                onBudgetAction={onBudgetAction}
                style={getCellBackgroundStyle(column.type, column.month)}
              />
            );
          case 'spent':
            return (
              <CategorySpentCell
                month={column.month}
                category={item.value}
                onShowActivity={onShowActivity}
                style={getCellBackgroundStyle(column.type, column.month)}
              />
            );
          case 'balance':
            return (
              <CategoryBalanceCell
                month={column.month}
                category={item.value}
                onBudgetAction={onBudgetAction}
                style={getCellBackgroundStyle(column.type, column.month)}
              />
            );
          default:
            throw new Error(`Unrecognized column type: ${column.type}`);
        }
      }}
    </ReactAriaRow>
  );
}
