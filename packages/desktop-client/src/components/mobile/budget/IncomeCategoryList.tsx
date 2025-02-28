import { useRef } from 'react';
import {
  DropIndicator,
  ListBox,
  ListBoxItem,
  useDragAndDrop,
} from 'react-aria-components';
import { useTranslation } from 'react-i18next';
import { useListData } from 'react-stately';

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
  const categoryListData = useListData({
    initialItems: categories.map((category, index) => ({
      ...category,
      index,
    })),
    getKey: category => category.id,
  });
  const dispatch = useDispatch();

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: keys =>
      [...keys].map(key => ({
        'text/plain': categoryListData.getItem(key).id,
      })),
    renderDropIndicator(target) {
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
    onReorder(e) {
      const [key] = e.keys;
      const categoryIdToMove = key as CategoryEntity['id'];
      const categoryGroupId = categoryListData.getItem(key).cat_group;
      const targetCategoryId = e.target.key as CategoryEntity['id'];

      if (e.target.dropPosition === 'before') {
        categoryListData.moveBefore(e.target.key, e.keys);

        dispatch(
          moveCategory({
            id: categoryIdToMove,
            groupId: categoryGroupId,
            targetId: targetCategoryId,
          }),
        );
      } else if (e.target.dropPosition === 'after') {
        categoryListData.moveAfter(e.target.key, e.keys);

        const { index: targetIndex } = categoryListData.getItem(e.target.key);
        const nextToTargetCategory = categoryListData.items[targetIndex + 1];

        dispatch(
          moveCategory({
            id: categoryIdToMove,
            groupId: categoryGroupId,
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
      items={categoryListData.items}
      dragAndDropHooks={dragAndDropHooks}
    >
      {category => (
        <IncomeCategoryListItem
          key={category.id}
          value={category}
          month={month}
          style={{
            backgroundColor: monthUtils.isCurrentMonth(month)
              ? theme.budgetCurrentMonth
              : theme.budgetOtherMonth,
          }}
          onEdit={onEditCategory}
          onBudgetAction={onBudgetAction}
        />
      )}
    </ListBox>
  );
}

function IncomeCategoryName({ category, onEdit }) {
  const sidebarColumnWidth = getColumnWidth({ isSidebar: true, offset: -10 });
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

function IncomeCategoryCells({ category, month, onBudgetAction }) {
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

function IncomeCategoryListItem({
  month,
  style,
  onEdit,
  onBudgetAction,
  ...props
}) {
  const listItemRef = useRef();
  const { value: category } = props;

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
          paddingLeft: 5,
          paddingRight: 5,
          zIndex: 1,
          justifyContent: 'space-between',
          backgroundColor: 'transparent',
          borderBottomWidth: 0.5,
          borderTopWidth: 0.5,
          opacity: !!category.hidden ? 0.5 : undefined,
          ...style,
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
