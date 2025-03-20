import React, { type ComponentPropsWithoutRef } from 'react';
import {
  Row as ReactAriaRow,
  Cell as ReactAriaCell,
} from 'react-aria-components';

import type {
  CategoryEntity,
  CategoryGroupEntity,
} from 'loot-core/types/models';

import { useSyncedPref } from '../../hooks/useSyncedPref';

import {
  type ColumnDefinition,
  getCategoryRowStyle,
} from './BudgetCategoriesV2';
import { CategoryBalanceCell } from './CategoryBalanceCell';
import { CategoryBudgetedCell } from './CategoryBudgetedCell';
import { CategoryNameCell } from './CategoryNameCell';

type IncomeCategoryRowProps = ComponentPropsWithoutRef<
  typeof ReactAriaRow<ColumnDefinition>
> & {
  item: {
    type: 'income-category';
    id: `income-category-${string}`;
    value: CategoryEntity;
    group: CategoryGroupEntity;
  };
  onBudgetAction: (month: string, action: string, args: unknown) => void;
  onRename: (category: CategoryEntity, newName: string) => void;
  onDelete: (category: CategoryEntity) => void;
  onToggleVisibility: (category: CategoryEntity) => void;
};
export function IncomeCategoryRow({
  item,
  onBudgetAction,
  onRename,
  onDelete,
  onToggleVisibility,
  style,
  ...props
}: IncomeCategoryRowProps) {
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');
  return budgetType === 'rollover' ? (
    <ReactAriaRow
      style={{
        ...getCategoryRowStyle(item.value),
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
            return <ReactAriaCell />;
          case 'spent':
            return <ReactAriaCell />;
          case 'balance':
            return (
              <CategoryBalanceCell
                month={column.month}
                category={item.value}
                onBudgetAction={onBudgetAction}
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
        ...getCategoryRowStyle(item.value),
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
              />
            );
          case 'spent':
            return <ReactAriaCell />;
          case 'balance':
            return (
              <CategoryBalanceCell
                month={column.month}
                category={item.value}
                onBudgetAction={onBudgetAction}
              />
            );
          default:
            throw new Error(`Unrecognized column type: ${column.type}`);
        }
      }}
    </ReactAriaRow>
  );
}
