import { type ComponentPropsWithoutRef, useRef } from 'react';
import { type DragItem } from 'react-aria';
import {
  DropIndicator,
  ListBox,
  ListBoxItem,
  useDragAndDrop,
} from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { AutoTextSize } from 'auto-text-size';

import { envelopeBudget, trackingBudget } from 'loot-core/client/queries';
import { moveCategory } from 'loot-core/client/queries/queriesSlice';
import * as monthUtils from 'loot-core/shared/months';
import { type CategoryEntity } from 'loot-core/types/models';

import { useSyncedPref } from '../../../hooks/useSyncedPref';
import { SvgCheveronRight } from '../../../icons/v1';
import { useDispatch } from '../../../redux';
import { PrivacyFilter } from '../../PrivacyFilter';
import { CellValue } from '../../spreadsheet/CellValue';
import { useFormat } from '../../spreadsheet/useFormat';

import { BudgetCell } from './BudgetCell';
import { getColumnWidth } from './BudgetTable';

type IncomeCategoryListProps = {
  categories: CategoryEntity[];
  month: string;
  onEditCategory: (id: string) => void;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
};

export function IncomeCategoryList({
  categories,
  month,
  onEditCategory,
  onBudgetAction,
}: IncomeCategoryListProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: keys =>
      [...keys].map(
        key =>
          ({
            'text/plain': categories.find(c => c.id === key)?.id,
          }) as DragItem,
      ),
    renderDropIndicator: target => {
      return (
        <DropIndicator
          target={target}
          style={{
            backgroundColor: theme.tableRowBackgroundHighlight,
            position: 'absolute',
            left: 2,
            right: 2,
            borderRadius: 3,
            height: 3,
          }}
        />
      );
    },
    onReorder: e => {
      const [key] = e.keys;
      const categoryIdToMove = key as CategoryEntity['id'];
      const categoryToMove = categories.find(c => c.id === categoryIdToMove);

      if (!categoryToMove) {
        throw new Error(
          `Internal error: category with ID ${categoryIdToMove} not found.`,
        );
      }

      if (!categoryToMove.cat_group) {
        throw new Error(
          `Internal error: category ${categoryIdToMove} is not in a group and cannot be moved.`,
        );
      }

      const targetCategoryId = e.target.key as CategoryEntity['id'];

      if (e.target.dropPosition === 'before') {
        dispatch(
          moveCategory({
            id: categoryToMove.id,
            groupId: categoryToMove.cat_group,
            targetId: targetCategoryId,
          }),
        );
      } else if (e.target.dropPosition === 'after') {
        const targetCategoryIndex = categories.findIndex(
          c => c.id === targetCategoryId,
        );

        if (targetCategoryIndex === -1) {
          throw new Error(
            `Internal error: category with ID ${targetCategoryId} not found.`,
          );
        }

        const nextToTargetCategory = categories[targetCategoryIndex + 1];

        dispatch(
          moveCategory({
            id: categoryToMove.id,
            groupId: categoryToMove.cat_group,
            // Due to the way `moveCategory` works, we use the category next to the
            // actual target category here because `moveCategory` always shoves the
            // category *before* the target category.
            // On the other hand, using `null` as `targetId` moves the category
            // to the end of the list.
            targetId: nextToTargetCategory?.id || null,
          }),
        );
      }
    },
  });

  return (
    <ListBox
      aria-label={t('Income categories')}
      items={categories}
      dragAndDropHooks={dragAndDropHooks}
    >
      {category => (
        <IncomeCategoryListItem
          key={category.id}
          value={category}
          month={month}
          onEdit={onEditCategory}
          onBudgetAction={onBudgetAction}
        />
      )}
    </ListBox>
  );
}

type IncomeCategoryNameProps = {
  category: CategoryEntity;
  onEdit: (id: CategoryEntity['id']) => void;
};

function IncomeCategoryName({ category, onEdit }: IncomeCategoryNameProps) {
  const sidebarColumnWidth = getColumnWidth({
    isSidebar: true,
    offset: -10,
  });
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'flex-start',
        width: sidebarColumnWidth,
      }}
    >
      <Button
        variant="bare"
        style={{
          maxWidth: sidebarColumnWidth,
        }}
        onPress={() => onEdit?.(category.id)}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <Text
            style={{
              ...styles.lineClamp(2),
              width: sidebarColumnWidth,
              textAlign: 'left',
              ...styles.smallText,
            }}
            data-testid="category-name"
          >
            {category.name}
          </Text>
          <SvgCheveronRight
            style={{ flexShrink: 0, color: theme.tableTextSubdued }}
            width={14}
            height={14}
          />
        </View>
      </Button>
    </View>
  );
}

type IncomeCategoryCellsProps = {
  category: CategoryEntity;
  month: string;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
};

function IncomeCategoryCells({
  category,
  month,
  onBudgetAction,
}: IncomeCategoryCellsProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const columnWidth = getColumnWidth();
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');

  const budgeted =
    budgetType === 'report' ? trackingBudget.catBudgeted(category.id) : null;

  const balance =
    budgetType === 'report'
      ? trackingBudget.catSumAmount(category.id)
      : envelopeBudget.catSumAmount(category.id);

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
      }}
    >
      {budgeted && (
        <View
          style={{
            width: columnWidth,
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
        >
          <BudgetCell
            binding={budgeted}
            type="financial"
            category={category}
            month={month}
            onBudgetAction={onBudgetAction}
          />
        </View>
      )}
      <CellValue<'envelope-budget' | 'tracking-budget', 'sum-amount'>
        binding={balance}
        type="financial"
        aria-label={t('Balance for {{categoryName}} category', {
          categoryName: category.name,
        })} // Translated aria-label
      >
        {({ type, value }) => (
          <View>
            <PrivacyFilter>
              <AutoTextSize
                key={value}
                as={Text}
                minFontSizePx={6}
                maxFontSizePx={12}
                mode="oneline"
                style={{
                  width: columnWidth,
                  justifyContent: 'center',
                  alignItems: 'flex-end',
                  textAlign: 'right',
                  fontSize: 12,
                  paddingRight: 5,
                }}
              >
                {format(value, type)}
              </AutoTextSize>
            </PrivacyFilter>
          </View>
        )}
      </CellValue>
    </View>
  );
}

type IncomeCategoryListItemProps = ComponentPropsWithoutRef<
  typeof ListBoxItem<CategoryEntity>
> & {
  month: string;
  onEdit: (id: CategoryEntity['id']) => void;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
};

function IncomeCategoryListItem({
  month,
  onEdit,
  onBudgetAction,
  ...props
}: IncomeCategoryListItemProps) {
  const listItemRef = useRef<HTMLDivElement | null>(null);
  const { value: category } = props;

  if (!category) {
    return null;
  }

  return (
    <ListBoxItem
      textValue={category.name}
      data-testid="category-row"
      {...props}
    >
      <View
        style={{
          height: 50,
          borderColor: theme.tableBorder,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: 5,
          paddingRight: 5,
          zIndex: 1,
          borderBottomWidth: 0.5,
          borderTopWidth: 0.5,
          opacity: !!category.hidden ? 0.5 : undefined,
          backgroundColor: monthUtils.isCurrentMonth(month)
            ? theme.budgetCurrentMonth
            : theme.budgetOtherMonth,
        }}
        innerRef={listItemRef}
      >
        <IncomeCategoryName category={category} onEdit={onEdit} />
        <IncomeCategoryCells
          category={category}
          month={month}
          onBudgetAction={onBudgetAction}
        />
      </View>
    </ListBoxItem>
  );
}
