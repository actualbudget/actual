import type { ComponentPropsWithoutRef } from 'react';
import { GridListItem } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { CategoryEntity } from '@actual-app/core/types/models';
import { css } from '@emotion/css';

import { useLongPress } from '#hooks/useLongPress';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import {
  getRowGridStyle,
  ROW_HEIGHT,
  ROW_PRESSABLE_STYLE,
} from './budgetTableStyles';
import { CategoryRowName } from './CategoryRowName';
import { ExpenseCategoryCells } from './ExpenseCategoryCells';
import { HiddenDragButton } from './HiddenDragButton';
import { useReorderMode } from './ReorderModeContext';

type ExpenseCategoryListItemProps = ComponentPropsWithoutRef<
  typeof GridListItem<CategoryEntity>
> & {
  month: string;
  isHidden: boolean;
  isDragging: boolean;
  show3Columns: boolean;
  showBudgetedColumn: boolean;
  onShowCategory: (id: CategoryEntity['id']) => void;
};

export function ExpenseCategoryListItem({
  month,
  isHidden,
  isDragging,
  onShowCategory,
  show3Columns,
  showBudgetedColumn,
  ...props
}: ExpenseCategoryListItemProps) {
  const { t } = useTranslation();
  const { value: category } = props;
  const dispatch = useDispatch();
  const isReordering = useReorderMode();
  const { handlers: longPressHandlers, wasRecentLongPress } = useLongPress(
    () => {
      if (category) {
        dispatch(
          pushModal({
            modal: {
              name: 'category-actions',
              options: { categoryId: category.id, month },
            },
          }),
        );
      }
    },
  );

  if (!category) {
    return null;
  }

  return (
    <GridListItem
      textValue={category.name}
      aria-label={t('Open {{categoryName}} category', {
        categoryName: category.name,
      })}
      data-testid="category-row"
      onAction={
        isReordering
          ? undefined
          : () => {
              if (!wasRecentLongPress()) {
                onShowCategory(category.id);
              }
            }
      }
      {...props}
    >
      <HiddenDragButton />
      <View
        {...(isReordering ? {} : longPressHandlers)}
        data-reorder-item="category"
        data-reorder-id={category.id}
        className={css({
          '[data-pressed] &': {
            backgroundColor: theme.tableRowBackgroundHover,
          },
        })}
        style={{
          ...ROW_PRESSABLE_STYLE,
          ...getRowGridStyle(show3Columns ? 2 : 1),
          height: ROW_HEIGHT,
          borderBottomWidth: 1,
          borderColor: theme.tableBorder,
          opacity: isDragging ? 0.4 : isHidden ? 0.5 : undefined,
          backgroundColor: monthUtils.isCurrentMonth(month)
            ? theme.budgetCurrentMonth
            : theme.budgetOtherMonth,
        }}
      >
        <CategoryRowName category={category} month={month} />
        <ExpenseCategoryCells
          key={`${category.id}-${show3Columns}-${showBudgetedColumn}`}
          category={category}
          month={month}
          show3Columns={show3Columns}
          showBudgetedColumn={showBudgetedColumn}
          wasRecentLongPress={wasRecentLongPress}
        />
      </View>
    </GridListItem>
  );
}
