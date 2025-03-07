import { type ComponentPropsWithoutRef, useCallback, useRef } from 'react';
import { type DragItem } from 'react-aria';
import {
  DropIndicator,
  ListBox,
  ListBoxItem,
  useDragAndDrop,
} from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { type CSSProperties, styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { AutoTextSize } from 'auto-text-size';

import { collapseModals, pushModal } from 'loot-core/client/modals/modalsSlice';
import { envelopeBudget, trackingBudget } from 'loot-core/client/queries';
import { moveCategory } from 'loot-core/client/queries/queriesSlice';
import * as monthUtils from 'loot-core/shared/months';
import { groupById, integerToCurrency } from 'loot-core/shared/util';
import { type CategoryEntity } from 'loot-core/types/models';

import { useCategories } from '../../../hooks/useCategories';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
import { useNavigate } from '../../../hooks/useNavigate';
import { useSyncedPref } from '../../../hooks/useSyncedPref';
import { useUndo } from '../../../hooks/useUndo';
import { SvgArrowThickRight, SvgCheveronRight } from '../../../icons/v1';
import { useDispatch } from '../../../redux';
import { BalanceWithCarryover } from '../../budget/BalanceWithCarryover';
import { makeAmountGrey, makeBalanceAmountStyle } from '../../budget/util';
import { PrivacyFilter } from '../../PrivacyFilter';
import { CellValue } from '../../spreadsheet/CellValue';
import { useFormat } from '../../spreadsheet/useFormat';
import { useSheetValue } from '../../spreadsheet/useSheetValue';

import { BudgetCell } from './BudgetCell';
import { getColumnWidth, PILL_STYLE } from './BudgetTable';

type ExpenseCategoryListProps = {
  categories: CategoryEntity[];
  shouldHideCategory: (category: CategoryEntity) => boolean;
  month: string;
  onEditCategory: (id: string) => void;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
  show3Columns: boolean;
  showBudgetedColumn: boolean;
};

export function ExpenseCategoryList({
  categories,
  month,
  onEditCategory,
  onBudgetAction,
  show3Columns,
  showBudgetedColumn,
  shouldHideCategory,
}: ExpenseCategoryListProps) {
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
      aria-label={t('Expense categories')}
      items={categories}
      dragAndDropHooks={dragAndDropHooks}
    >
      {category => (
        <ExpenseCategoryListItem
          key={category.id}
          value={category}
          month={month}
          onEdit={onEditCategory}
          onBudgetAction={onBudgetAction}
          isHidden={shouldHideCategory(category)}
          show3Columns={show3Columns}
          showBudgetedColumn={showBudgetedColumn}
        />
      )}
    </ListBox>
  );
}

type ExpenseCategoryNameProps = {
  category: CategoryEntity;
  onEdit: (id: CategoryEntity['id']) => void;
  show3Columns: boolean;
};

function ExpenseCategoryName({
  category,
  onEdit,
  show3Columns,
}: ExpenseCategoryNameProps) {
  const sidebarColumnWidth = getColumnWidth({
    show3Columns,
    isSidebar: true,
  });

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'flex-start',
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

type ExpenseCategoryCellsProps = {
  category: CategoryEntity;
  month: string;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
  show3Columns: boolean;
  showBudgetedCol: boolean;
  onOpenBalanceMenu: () => void;
  onShowActivity: () => void;
};

function ExpenseCategoryCells({
  category,
  month,
  onBudgetAction,
  show3Columns,
  showBudgetedCol: showBudgetedColumn,
  onOpenBalanceMenu,
  onShowActivity,
}: ExpenseCategoryCellsProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const columnWidth = getColumnWidth({
    show3Columns,
    isSidebar: false,
  });
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');

  const goal =
    budgetType === 'report'
      ? trackingBudget.catGoal(category.id)
      : envelopeBudget.catGoal(category.id);

  const longGoal =
    budgetType === 'report'
      ? trackingBudget.catLongGoal(category.id)
      : envelopeBudget.catLongGoal(category.id);

  const budgeted =
    budgetType === 'report'
      ? trackingBudget.catBudgeted(category.id)
      : envelopeBudget.catBudgeted(category.id);

  const spent =
    budgetType === 'report'
      ? trackingBudget.catSumAmount(category.id)
      : envelopeBudget.catSumAmount(category.id);

  const balance =
    budgetType === 'report'
      ? trackingBudget.catBalance(category.id)
      : envelopeBudget.catBalance(category.id);

  const carryover =
    budgetType === 'report'
      ? trackingBudget.catCarryover(category.id)
      : envelopeBudget.catCarryover(category.id);

  const goalTemp = useSheetValue<'envelope-budget' | 'tracking-budget', 'goal'>(
    goal,
  );
  const goalValue = isGoalTemplatesEnabled ? goalTemp : null;

  const budgetedtmp = useSheetValue<
    'envelope-budget' | 'tracking-budget',
    'budget'
  >(budgeted);
  const balancetmp = useSheetValue<
    'envelope-budget' | 'tracking-budget',
    'leftover'
  >(balance);
  const isLongGoal =
    useSheetValue<'envelope-budget' | 'tracking-budget', 'long-goal'>(
      longGoal,
    ) === 1;
  const budgetedValue = isGoalTemplatesEnabled
    ? isLongGoal
      ? balancetmp
      : budgetedtmp
    : null;

  return (
    <View
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        flexDirection: 'row',
      }}
    >
      <View
        style={{
          ...(!show3Columns && !showBudgetedColumn && { display: 'none' }),
          width: columnWidth,
          justifyContent: 'center',
          alignItems: 'flex-end',
        }}
      >
        <BudgetCell
          key={`${show3Columns}|${showBudgetedColumn}`}
          binding={budgeted}
          type="financial"
          category={category}
          month={month}
          onBudgetAction={onBudgetAction}
        />
      </View>
      <View
        style={{
          ...(!show3Columns && showBudgetedColumn && { display: 'none' }),
          width: columnWidth,
          justifyContent: 'center',
          alignItems: 'flex-end',
        }}
      >
        <CellValue<'envelope-budget' | 'tracking-budget', 'sum-amount'>
          binding={spent}
          type="financial"
          aria-label={t('Spent amount for {{categoryName}} category', {
            categoryName: category.name,
          })} // Translated aria-label
        >
          {({ type, value }) => (
            <Button
              variant="bare"
              style={{
                ...PILL_STYLE,
              }}
              onPress={onShowActivity}
              aria-label={t('Show transactions for {{categoryName}} category', {
                categoryName: category.name,
              })} // Translated aria-label
            >
              <PrivacyFilter>
                <AutoTextSize
                  key={`${value}|${show3Columns}|${showBudgetedColumn}`}
                  as={Text}
                  minFontSizePx={6}
                  maxFontSizePx={12}
                  mode="oneline"
                  style={{
                    ...makeAmountGrey(value),
                    maxWidth: columnWidth,
                    textAlign: 'right',
                    fontSize: 12,
                  }}
                >
                  {format(value, type)}
                </AutoTextSize>
              </PrivacyFilter>
            </Button>
          )}
        </CellValue>
      </View>
      <View
        style={{
          width: columnWidth,
          justifyContent: 'center',
          alignItems: 'flex-end',
        }}
      >
        <BalanceWithCarryover
          aria-label={t('Balance for {{categoryName}} category', {
            categoryName: category.name,
          })} // Translated aria-label
          type="financial"
          carryover={carryover}
          balance={balance}
          goal={goal}
          budgeted={budgeted}
          longGoal={longGoal}
          CarryoverIndicator={({ style }) => (
            <View
              style={{
                position: 'absolute',
                right: '-3px',
                top: '-5px',
                borderRadius: '50%',
                backgroundColor: style?.color ?? theme.pillText,
              }}
            >
              <SvgArrowThickRight
                width={11}
                height={11}
                style={{ color: theme.pillBackgroundLight }}
              />
            </View>
          )}
        >
          {({ type, value }) => (
            <Button
              variant="bare"
              style={{
                ...PILL_STYLE,
                maxWidth: columnWidth,
              }}
              onPress={onOpenBalanceMenu}
              aria-label={t('Open balance menu for {{categoryName}} category', {
                categoryName: category.name,
              })} // Translated aria-label
            >
              <PrivacyFilter>
                <AutoTextSize
                  key={value}
                  as={Text}
                  minFontSizePx={6}
                  maxFontSizePx={12}
                  mode="oneline"
                  style={{
                    maxWidth: columnWidth,
                    ...makeBalanceAmountStyle(value, goalValue, budgetedValue),
                    textAlign: 'right',
                    fontSize: 12,
                  }}
                >
                  {format(value, type)}
                </AutoTextSize>
              </PrivacyFilter>
            </Button>
          )}
        </BalanceWithCarryover>
      </View>
    </View>
  );
}

type ExpenseCategoryListItemProps = ComponentPropsWithoutRef<
  typeof ListBoxItem<CategoryEntity>
> & {
  month: string;
  isHidden: boolean;
  style?: CSSProperties;
  show3Columns: boolean;
  showBudgetedColumn: boolean;
  onEdit: (id: CategoryEntity['id']) => void;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
};

function ExpenseCategoryListItem({
  month,
  isHidden,
  onEdit,
  onBudgetAction,
  show3Columns,
  showBudgetedColumn: showBudgetedCol,
  ...props
}: ExpenseCategoryListItemProps) {
  const { value: category } = props;

  const { t } = useTranslation();
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');

  const modalBudgetType = budgetType === 'rollover' ? 'envelope' : 'tracking';
  const dispatch = useDispatch();
  const { showUndoNotification } = useUndo();
  const { list: categories } = useCategories();
  const categoriesById = groupById(categories);

  const onCarryover = useCallback(
    carryover => {
      onBudgetAction(month, 'carryover', {
        category: category.id,
        flag: carryover,
      });
      dispatch(
        collapseModals({ rootModalName: `${modalBudgetType}-balance-menu` }),
      );
    },
    [modalBudgetType, category.id, dispatch, month, onBudgetAction],
  );

  const catBalance = useSheetValue<
    'envelope-budget' | 'tracking-budget',
    'leftover'
  >(
    budgetType === 'rollover'
      ? envelopeBudget.catBalance(category.id)
      : trackingBudget.catBalance(category.id),
  );

  const onTransfer = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'transfer',
          options: {
            title: category.name,
            categoryId: category.id,
            month,
            amount: catBalance,
            onSubmit: (amount, toCategoryId) => {
              onBudgetAction(month, 'transfer-category', {
                amount,
                from: category.id,
                to: toCategoryId,
              });
              dispatch(
                collapseModals({
                  rootModalName: `${modalBudgetType}-balance-menu`,
                }),
              );
              showUndoNotification({
                message: `Transferred ${integerToCurrency(amount)} from ${category.name} to ${categoriesById[toCategoryId].name}.`,
              });
            },
            showToBeBudgeted: true,
          },
        },
      }),
    );
  }, [
    modalBudgetType,
    catBalance,
    categoriesById,
    category.id,
    category.name,
    dispatch,
    month,
    onBudgetAction,
    showUndoNotification,
  ]);

  const onCover = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'cover',
          options: {
            title: category.name,
            month,
            categoryId: category.id,
            onSubmit: fromCategoryId => {
              onBudgetAction(month, 'cover-overspending', {
                to: category.id,
                from: fromCategoryId,
              });
              dispatch(
                collapseModals({
                  rootModalName: `${modalBudgetType}-balance-menu`,
                }),
              );
              showUndoNotification({
                message: t(
                  `Covered {{toCategoryName}} overspending from {{fromCategoryName}}.`,
                  {
                    toCategoryName: category.name,
                    fromCategoryName: categoriesById[fromCategoryId].name,
                  },
                ),
              });
            },
          },
        },
      }),
    );
  }, [
    modalBudgetType,
    categoriesById,
    category.id,
    category.name,
    dispatch,
    month,
    onBudgetAction,
    showUndoNotification,
    t,
  ]);

  const onOpenBalanceMenu = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: `${modalBudgetType}-balance-menu`,
          options: {
            categoryId: category.id,
            month,
            onCarryover,
            ...(budgetType === 'rollover' && { onTransfer, onCover }),
          },
        },
      }),
    );
  }, [
    modalBudgetType,
    budgetType,
    category.id,
    dispatch,
    month,
    onCarryover,
    onCover,
    onTransfer,
  ]);

  const listItemRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const onShowActivity = useCallback(() => {
    navigate(`/categories/${category.id}?month=${month}`);
  }, [category.id, month, navigate]);

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
          borderBottomWidth: 0.5,
          borderTopWidth: 0.5,
          opacity: isHidden ? 0.5 : undefined,
          backgroundColor: monthUtils.isCurrentMonth(month)
            ? theme.budgetCurrentMonth
            : theme.budgetOtherMonth,
        }}
        innerRef={listItemRef}
      >
        <ExpenseCategoryName
          category={category}
          onEdit={onEdit}
          show3Columns={show3Columns}
        />
        <ExpenseCategoryCells
          category={category}
          month={month}
          onBudgetAction={onBudgetAction}
          show3Columns={show3Columns}
          showBudgetedCol={showBudgetedCol}
          onOpenBalanceMenu={onOpenBalanceMenu}
          onShowActivity={onShowActivity}
        />
      </View>
    </ListBoxItem>
  );
}
