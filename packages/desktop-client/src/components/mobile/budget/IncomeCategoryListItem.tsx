import type { ComponentPropsWithoutRef } from 'react';
import { GridListItem } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { CategoryEntity } from '@actual-app/core/types/models';
import { css } from '@emotion/css';

import { useLongPress } from '#hooks/useLongPress';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import {
  getRowGridStyle,
  ROW_HEIGHT,
  ROW_PRESSABLE_STYLE,
} from './budgetTableStyles';
import { CategoryRowName } from './CategoryRowName';
import { HiddenDragButton } from './HiddenDragButton';
import { IncomeCategoryCells } from './IncomeCategoryCells';
import { useReorderMode } from './ReorderModeContext';

type IncomeCategoryListItemProps = ComponentPropsWithoutRef<
  typeof GridListItem<CategoryEntity>
> & {
  month: string;
  isDragging: boolean;
  onShowCategory: (id: CategoryEntity['id']) => void;
};

export function IncomeCategoryListItem({
  month,
  isDragging,
  onShowCategory,
  ...props
}: IncomeCategoryListItemProps) {
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
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');

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
          ...getRowGridStyle(budgetType === 'tracking' ? 1 : 0),
          height: ROW_HEIGHT,
          borderBottomWidth: 1,
          borderColor: theme.tableBorder,
          opacity: isDragging ? 0.4 : category.hidden ? 0.5 : undefined,
          backgroundColor: monthUtils.isCurrentMonth(month)
            ? theme.budgetCurrentMonth
            : theme.budgetOtherMonth,
        }}
      >
        <CategoryRowName category={category} month={month} />
        <IncomeCategoryCells
          category={category}
          month={month}
          wasRecentLongPress={wasRecentLongPress}
        />
      </View>
    </GridListItem>
  );
}
