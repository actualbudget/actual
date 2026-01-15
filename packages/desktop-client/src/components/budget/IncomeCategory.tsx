// @ts-strict-ignore
import React, { type ComponentProps } from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type CategoryEntity } from 'loot-core/types/models';

import { CURRENCY_COLUMN_WIDTH } from './constants';
import { RenderMonths } from './RenderMonths';
import { SidebarCategory } from './SidebarCategory';

import { useBudgetComponents } from '.';

import {
  DropHighlight,
  useDraggable,
  useDroppable,
  type OnDragChangeCallback,
  type OnDropCallback,
} from '@desktop-client/components/sort';
import { Row } from '@desktop-client/components/table';
import { useDragRef } from '@desktop-client/hooks/useDragRef';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

type IncomeCategoryProps = {
  cat: CategoryEntity;
  isLast?: boolean;
  editingCell: { id: CategoryEntity['id']; cell: string } | null;
  onEditName: ComponentProps<typeof SidebarCategory>['onEditName'];
  onEditMonth?: (id: CategoryEntity['id'], month: string) => void;
  onSave: ComponentProps<typeof SidebarCategory>['onSave'];
  onDelete: ComponentProps<typeof SidebarCategory>['onDelete'];
  onDragChange: OnDragChangeCallback<CategoryEntity>;
  onBudgetAction: (month: string, action: string, arg: unknown) => void;
  onReorder: OnDropCallback;
  onShowActivity: (id: CategoryEntity['id'], month: string) => void;
};

export function IncomeCategory({
  cat,
  isLast,
  editingCell,
  onEditName,
  onEditMonth,
  onSave,
  onDelete,
  onDragChange,
  onBudgetAction,
  onReorder,
  onShowActivity,
}: IncomeCategoryProps) {
  const { dragRef } = useDraggable({
    type: 'income-category',
    onDragChange,
    item: cat,
    canDrag: editingCell === null,
  });
  const handleDragRef = useDragRef(dragRef);

  const { dropRef, dropPos } = useDroppable({
    types: 'income-category',
    id: cat.id,
    onDrop: onReorder,
  });

  const { IncomeCategoryComponent: MonthComponent } = useBudgetComponents();

  const [enableMultiCurrencyOnBudget] = useSyncedPref(
    'enableMultiCurrencyOnBudget',
  );
  const showCurrencyColumn = enableMultiCurrencyOnBudget === 'true';

  return (
    <Row
      innerRef={dropRef}
      collapsed
      style={{
        opacity: cat.hidden ? 0.5 : undefined,
      }}
    >
      <DropHighlight pos={dropPos} offset={{ top: 1 }} />

      <SidebarCategory
        innerRef={handleDragRef}
        category={cat}
        isLast={isLast}
        editing={
          editingCell &&
          editingCell.cell === 'name' &&
          editingCell.id === cat.id
        }
        onEditName={onEditName}
        onSave={onSave}
        onDelete={onDelete}
      />
      {showCurrencyColumn && (
        <View
          style={{
            width: CURRENCY_COLUMN_WIDTH,
            flexShrink: 0,
            borderTopWidth: 1,
            borderBottomWidth: isLast ? 0 : 1,
            borderColor: theme.tableBorder,
          }}
        />
      )}
      <RenderMonths>
        {({ month }) => (
          <MonthComponent
            month={month}
            editing={
              editingCell &&
              editingCell.id === cat.id &&
              editingCell.cell === month
            }
            category={cat}
            isLast={isLast}
            onEdit={onEditMonth}
            onBudgetAction={onBudgetAction}
            onShowActivity={onShowActivity}
          />
        )}
      </RenderMonths>
    </Row>
  );
}
