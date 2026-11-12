import { useCallback } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { GridListItem } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheveronRight } from '@actual-app/components/icons/v1';
import { SvgInformationCircle } from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import type { CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { BudgetType } from '@actual-app/core/server/prefs';
import * as monthUtils from '@actual-app/core/shared/months';
import type { IntegerAmount } from '@actual-app/core/shared/util';
import type { CategoryEntity } from '@actual-app/core/types/models';

import { useCategoriesById } from '#hooks/useCategories';
import { useConvertedSpending } from '#hooks/useCategoryCurrencies';
import { useFormat } from '#hooks/useFormat';
import { useNavigate } from '#hooks/useNavigate';
import { useSheetValue } from '#hooks/useSheetValue';
import { useShownCategoryLines } from '#hooks/useShownCurrencyLines';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useUndo } from '#hooks/useUndo';
import { collapseModals, pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import { envelopeBudget, trackingBudget } from '#spreadsheet/bindings';

import { BalanceCell } from './BalanceCell';
import { BudgetCell } from './BudgetCell';
import { getColumnWidth, ROW_HEIGHT } from './BudgetTable';
import { SpentCell } from './SpentCell';
import { TotalCell } from './TotalCell';

type ExpenseCategoryNameProps = {
  category: CategoryEntity;
  month: string;
  onEditCategory: (id: CategoryEntity['id']) => void;
  show3Columns: boolean;
};

function ExpenseCategoryName({
  category,
  month,
  onEditCategory,
  show3Columns,
}: ExpenseCategoryNameProps) {
  const { t } = useTranslation();
  const sidebarColumnWidth = getColumnWidth({
    show3Columns,
    isSidebar: true,
  });
  // Its menu tells what is converted from other currencies
  const hasConvertedSpending =
    useConvertedSpending(category.id, month).length > 0;

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
        onPress={() => onEditCategory?.(category.id)}
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
              width: hasConvertedSpending
                ? `calc(${sidebarColumnWidth} - 14px)`
                : sidebarColumnWidth,
              textAlign: 'left',
              ...styles.smallText,
            }}
            data-testid="category-name"
          >
            {category.name}
          </Text>
          {hasConvertedSpending && (
            <SvgInformationCircle
              aria-label={t('Spending converted from another currency')}
              style={{ flexShrink: 0, color: theme.pageTextLight }}
              width={12}
              height={12}
            />
          )}
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
  // The currency of a currency line, whose amounts are shown in it
  currencyCode?: string;
  // The total of a category with currency lines, which is only shown
  showTotal?: boolean;
  month: string;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
  show3Columns: boolean;
  showBudgetedColumn: boolean;
  onOpenBalanceMenu: () => void;
  onShowActivity: () => void;
};

function ExpenseCategoryCells({
  category,
  currencyCode,
  showTotal = false,
  month,
  onBudgetAction,
  show3Columns,
  showBudgetedColumn,
  onOpenBalanceMenu,
  onShowActivity,
}: ExpenseCategoryCellsProps) {
  const { t } = useTranslation();
  const columnWidth = getColumnWidth({
    show3Columns,
    isSidebar: false,
  });
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');

  const budgeted =
    budgetType === 'tracking'
      ? trackingBudget.catBudgeted(category.id)
      : envelopeBudget.catBudgeted(category.id);

  const spent =
    budgetType === 'tracking'
      ? trackingBudget.catSumAmount(category.id)
      : envelopeBudget.catSumAmount(category.id);

  const balance =
    budgetType === 'tracking'
      ? trackingBudget.catBalance(category.id)
      : envelopeBudget.catBalance(category.id);

  if (showTotal) {
    const bindings =
      budgetType === 'tracking' ? trackingBudget : envelopeBudget;
    return (
      <View
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          flexDirection: 'row',
        }}
      >
        <TotalCell
          categoryId={category.id}
          month={month}
          binding={bindings.catBudgetedTotal(category.id)}
          width={columnWidth}
          hidden={!show3Columns && !showBudgetedColumn}
        />
        <TotalCell
          categoryId={category.id}
          month={month}
          binding={bindings.catSumAmountTotal(category.id)}
          width={columnWidth}
          hidden={!show3Columns && showBudgetedColumn}
        />
        <TotalCell
          categoryId={category.id}
          month={month}
          binding={bindings.catBalanceTotal(category.id)}
          width={columnWidth}
        />
      </View>
    );
  }

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
          currencyCode={currencyCode}
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
        <SpentCell
          binding={spent}
          category={category}
          currencyCode={currencyCode}
          month={month}
          show3Columns={show3Columns}
          onPress={onShowActivity}
        />
      </View>
      <View
        style={{
          width: columnWidth,
          justifyContent: 'center',
          alignItems: 'flex-end',
        }}
      >
        <BalanceCell
          binding={balance}
          category={category}
          currencyCode={currencyCode}
          show3Columns={show3Columns}
          onPress={onOpenBalanceMenu}
          aria-label={t('Open balance menu for {{categoryName}} category', {
            categoryName: category.name,
          })}
        />
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
  onEditCategory: (id: CategoryEntity['id']) => void;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
};

export function ExpenseCategoryListItem({
  month,
  isHidden,
  onEditCategory,
  onBudgetAction,
  show3Columns,
  showBudgetedColumn,
  ...props
}: ExpenseCategoryListItemProps) {
  const { value: category } = props;
  // A category budgeted in several currencies shows its total, then a line
  // per currency that has something in the month
  const { lines, probes } = useShownCategoryLines(category?.id, month);
  const navigate = useNavigate();
  const onShowActivity = useCallback(() => {
    if (!category) {
      return;
    }
    void navigate(`/categories/${category.id}?month=${month}`);
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
      <View>
        {probes}
        <ExpenseCategoryRow
          category={category}
          month={month}
          isHidden={isHidden}
          showTotal={lines.length > 0}
          onEditCategory={onEditCategory}
          onBudgetAction={onBudgetAction}
          onShowActivity={onShowActivity}
          show3Columns={show3Columns}
          showBudgetedColumn={showBudgetedColumn}
        />
        {lines.map(line => (
          <ExpenseCategoryRow
            key={line.id}
            // Named after the category and its currency, the category's own
            // budget too
            category={{
              ...category,
              id: line.id,
              name: `${category.name} (${line.currencyCode})`,
            }}
            label={line.currencyCode}
            currencyCode={
              line.id === category.id ? undefined : line.currencyCode
            }
            isEmpty={line.startMonth != null && month < line.startMonth}
            month={month}
            isHidden={isHidden}
            onBudgetAction={onBudgetAction}
            onShowActivity={onShowActivity}
            show3Columns={show3Columns}
            showBudgetedColumn={showBudgetedColumn}
          />
        ))}
      </View>
    </GridListItem>
  );
}

type ExpenseCategoryRowProps = {
  // The category, or one of its currency lines named after it
  category: CategoryEntity;
  // Shown instead of the name of a line of the category
  label?: string;
  currencyCode?: string;
  showTotal?: boolean;
  // A currency line before its first month
  isEmpty?: boolean;
  month: string;
  isHidden: boolean;
  show3Columns: boolean;
  showBudgetedColumn: boolean;
  onEditCategory?: (id: CategoryEntity['id']) => void;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
  onShowActivity: () => void;
};

function ExpenseCategoryRow({
  category,
  label,
  currencyCode,
  showTotal = false,
  isEmpty = false,
  month,
  isHidden,
  show3Columns,
  showBudgetedColumn,
  onEditCategory,
  onBudgetAction,
  onShowActivity,
}: ExpenseCategoryRowProps) {
  const { t } = useTranslation();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const format = useFormat();

  const balanceMenuModalName =
    `${budgetType as BudgetType}-balance-menu` as const;
  const dispatch = useDispatch();
  const { showUndoNotification } = useUndo();
  const {
    data: { list: categoriesById } = {
      list: {} as Record<string, CategoryEntity>,
    },
  } = useCategoriesById();

  const onCarryover = useCallback(
    (carryover: boolean) => {
      if (!category) {
        return;
      }
      onBudgetAction(month, 'carryover', {
        category: category.id,
        flag: carryover,
      });
    },
    [category, onBudgetAction, month],
  );

  const catBalance = useSheetValue<
    'envelope-budget' | 'tracking-budget',
    'leftover'
  >(
    budgetType === 'envelope'
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
                currencyCode: format.currency.code,
              });
              dispatch(collapseModals({ rootModalName: balanceMenuModalName }));
              showUndoNotification({
                message: t(
                  'Transferred {{amount}} from {{fromCategoryName}} to {{toCategoryName}}.',
                  {
                    amount: format(amount, 'financial', { currencyCode }),
                    fromCategoryName: category.name,
                    toCategoryName: categoriesById[toCategoryId].name,
                  },
                ),
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
    currencyCode,
    format,
    t,
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
            amount: catBalance,
            categoryId: category.id,
            onSubmit: (amount, fromCategoryId) => {
              onBudgetAction(month, 'cover-overspending', {
                to: category.id,
                from: fromCategoryId,
                amount,
                currencyCode: format.currency.code,
              });
              dispatch(collapseModals({ rootModalName: balanceMenuModalName }));
              showUndoNotification({
                message: t(
                  `Covered {{amount}} {{toCategoryName}} overspending from {{fromCategoryName}}.`,
                  {
                    amount: format(amount, 'financial', { currencyCode }),
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
    catBalance,
    onBudgetAction,
    balanceMenuModalName,
    showUndoNotification,
    t,
    categoriesById,
    currencyCode,
    format,
  ]);

  const onFundGoal = useCallback(
    (amount: IntegerAmount) => {
      if (!category) {
        return;
      }
      onBudgetAction(month, 'transfer-available', {
        amount,
        category: category.id,
      });
      dispatch(collapseModals({ rootModalName: balanceMenuModalName }));
      showUndoNotification({
        message: t('Transferred {{amount}} to {{categoryName}}', {
          amount: format(amount, 'financial', { currencyCode }),
          categoryName: category.name,
        }),
      });
    },
    [
      category,
      dispatch,
      month,
      onBudgetAction,
      balanceMenuModalName,
      showUndoNotification,
      t,
      currencyCode,
      format,
    ],
  );

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
              onFundGoal,
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
    onFundGoal,
  ]);

  return (
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
      {label != null ? (
        <Text
          style={{
            ...styles.smallText,
            flex: 1,
            paddingLeft: 20,
            color: theme.pageTextSubdued,
          }}
          data-testid="category-currency-line"
        >
          {label}
        </Text>
      ) : (
        <ExpenseCategoryName
          category={category}
          month={month}
          onEditCategory={id => onEditCategory?.(id)}
          show3Columns={show3Columns}
        />
      )}
      {!isEmpty && (
        <ExpenseCategoryCells
          key={`${category.id}-${show3Columns}-${showBudgetedColumn}`}
          category={category}
          currencyCode={currencyCode}
          showTotal={showTotal}
          month={month}
          onBudgetAction={onBudgetAction}
          show3Columns={show3Columns}
          showBudgetedColumn={showBudgetedColumn}
          onOpenBalanceMenu={onOpenBalanceMenu}
          onShowActivity={onShowActivity}
        />
      )}
    </View>
  );
}
