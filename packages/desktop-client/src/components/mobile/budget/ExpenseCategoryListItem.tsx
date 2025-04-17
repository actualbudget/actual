import { type ComponentPropsWithoutRef, useCallback } from 'react';
import { GridListItem } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgArrowThickRight,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { styles, type CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { AutoTextSize } from 'auto-text-size';

import { collapseModals, pushModal } from 'loot-core/client/modals/modalsSlice';
import { envelopeBudget, trackingBudget } from 'loot-core/client/queries';
import * as monthUtils from 'loot-core/shared/months';
import { groupById, integerToCurrency } from 'loot-core/shared/util';
import { type CategoryEntity } from 'loot-core/types/models';

import { useCategories } from '../../../hooks/useCategories';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
import { useNavigate } from '../../../hooks/useNavigate';
import { useSyncedPref } from '../../../hooks/useSyncedPref';
import { useUndo } from '../../../hooks/useUndo';
import { useDispatch } from '../../../redux';
import { BalanceWithCarryover } from '../../budget/BalanceWithCarryover';
import { makeAmountGrey, makeBalanceAmountStyle } from '../../budget/util';
import { PrivacyFilter } from '../../PrivacyFilter';
import { CellValue } from '../../spreadsheet/CellValue';
import { useFormat } from '../../spreadsheet/useFormat';
import { useSheetValue } from '../../spreadsheet/useSheetValue';

import { BudgetCell } from './BudgetCell';
import { getColumnWidth, PILL_STYLE, ROW_HEIGHT } from './BudgetTable';

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
      {/* Hidden drag button */}
      <Button
        slot="drag"
        style={{
          opacity: 0,
          width: 1,
          height: 1,
          position: 'absolute',
          overflow: 'hidden',
        }}
      />
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
  showBudgetedColumn: boolean;
  onOpenBalanceMenu: () => void;
  onShowActivity: () => void;
};

function ExpenseCategoryCells({
  category,
  month,
  onBudgetAction,
  show3Columns,
  showBudgetedColumn,
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
                  key={value}
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
  typeof GridListItem<CategoryEntity>
> & {
  month: string;
  isHidden: boolean;
  style?: CSSProperties;
  show3Columns: boolean;
  showBudgetedColumn: boolean;
  onEdit: (id: CategoryEntity['id']) => void;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
};

export function ExpenseCategoryListItem({
  month,
  isHidden,
  onEdit,
  onBudgetAction,
  show3Columns,
  showBudgetedColumn,
  ...props
}: ExpenseCategoryListItemProps) {
  const { value: category } = props;

  const { t } = useTranslation();
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');

  const modalBudgetType = budgetType === 'rollover' ? 'envelope' : 'tracking';
  const balanceMenuModalName = `${modalBudgetType}-balance-menu` as const;
  const dispatch = useDispatch();
  const { showUndoNotification } = useUndo();
  const { list: categories } = useCategories();
  const categoriesById = groupById(categories);

  const onCarryover = useCallback(
    (carryover: boolean) => {
      if (!category) {
        return;
      }
      onBudgetAction(month, 'carryover', {
        category: category.id,
        flag: carryover,
      });
      dispatch(collapseModals({ rootModalName: balanceMenuModalName }));
    },
    [category, onBudgetAction, month, dispatch, balanceMenuModalName],
  );

  const catBalance = useSheetValue<
    'envelope-budget' | 'tracking-budget',
    'leftover'
  >(
    budgetType === 'rollover'
      ? envelopeBudget.catBalance(category?.id)
      : trackingBudget.catBalance(category?.id),
  );

  const onTransfer = useCallback(() => {
    if (!category) {
      return;
    }
    dispatch(
      pushModal({
        modal: {
          name: 'transfer',
          options: {
            title: category.name,
            categoryId: category.id,
            month,
            amount: catBalance || 0,
            onSubmit: (amount, toCategoryId) => {
              onBudgetAction(month, 'transfer-category', {
                amount,
                from: category.id,
                to: toCategoryId,
              });
              dispatch(collapseModals({ rootModalName: balanceMenuModalName }));
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
    category,
    dispatch,
    month,
    catBalance,
    onBudgetAction,
    balanceMenuModalName,
    showUndoNotification,
    categoriesById,
  ]);

  const onCover = useCallback(() => {
    if (!category) {
      return;
    }
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
              dispatch(collapseModals({ rootModalName: balanceMenuModalName }));
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
    category,
    dispatch,
    month,
    onBudgetAction,
    balanceMenuModalName,
    showUndoNotification,
    t,
    categoriesById,
  ]);

  const onOpenBalanceMenu = useCallback(() => {
    if (!category) {
      return;
    }
    if (balanceMenuModalName === 'envelope-balance-menu') {
      dispatch(
        pushModal({
          modal: {
            name: balanceMenuModalName,
            options: {
              month,
              categoryId: category.id,
              onCarryover,
              onTransfer,
              onCover,
            },
          },
        }),
      );
    } else {
      dispatch(
        pushModal({
          modal: {
            name: balanceMenuModalName,
            options: {
              month,
              categoryId: category.id,
              onCarryover,
            },
          },
        }),
      );
    }
  }, [
    category,
    balanceMenuModalName,
    dispatch,
    month,
    onCarryover,
    onTransfer,
    onCover,
  ]);

  const navigate = useNavigate();
  const onShowActivity = useCallback(() => {
    if (!category) {
      return;
    }
    navigate(`/categories/${category.id}?month=${month}`);
  }, [category, month, navigate]);

  if (!category) {
    return null;
  }

  return (
    <GridListItem
      textValue={category.name}
      data-testid="category-row"
      {...props}
    >
      <View
        style={{
          height: ROW_HEIGHT,
          borderColor: theme.tableBorder,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: 5,
          paddingRight: 5,
          borderBottomWidth: 1,
          opacity: isHidden ? 0.5 : undefined,
          backgroundColor: monthUtils.isCurrentMonth(month)
            ? theme.budgetCurrentMonth
            : theme.budgetOtherMonth,
        }}
      >
        <ExpenseCategoryName
          category={category}
          onEdit={onEdit}
          show3Columns={show3Columns}
        />
        <ExpenseCategoryCells
          key={`${category.id}-${show3Columns}-${showBudgetedColumn}`}
          category={category}
          month={month}
          onBudgetAction={onBudgetAction}
          show3Columns={show3Columns}
          showBudgetedColumn={showBudgetedColumn}
          onOpenBalanceMenu={onOpenBalanceMenu}
          onShowActivity={onShowActivity}
        />
      </View>
    </GridListItem>
  );
}
