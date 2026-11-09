import { useCallback } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { GridListItem } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheveronRight } from '@actual-app/components/icons/v1';
import { SvgInformationCircle } from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { CategoryEntity } from '@actual-app/core/types/models';

import { useConvertedSpending } from '#hooks/useCategoryCurrencies';
import { useNavigate } from '#hooks/useNavigate';
import { useShownCategoryLines } from '#hooks/useShownCurrencyLines';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import { envelopeBudget, trackingBudget } from '#spreadsheet/bindings';

import { BalanceCell } from './BalanceCell';
import { BudgetCell } from './BudgetCell';
import { getColumnWidth, ROW_HEIGHT } from './BudgetTable';
import { TotalCell } from './TotalCell';

type IncomeCategoryNameProps = {
  category: CategoryEntity;
  month: string;
  onEdit: (id: CategoryEntity['id']) => void;
};

function IncomeCategoryName({
  category,
  month,
  onEdit,
}: IncomeCategoryNameProps) {
  const { t } = useTranslation();
  const sidebarColumnWidth = getColumnWidth({
    isSidebar: true,
    offset: -10,
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
        width: sidebarColumnWidth,
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

type IncomeCategoryCellsProps = {
  category: CategoryEntity;
  // The currency of a currency line, whose amounts are shown in it
  currencyCode?: string;
  // The total of a category with currency lines, which is only shown
  showTotal?: boolean;
  month: string;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
  onPress: () => void;
};

function IncomeCategoryCells({
  category,
  currencyCode,
  showTotal = false,
  month,
  onBudgetAction,
  onPress,
}: IncomeCategoryCellsProps) {
  const { t } = useTranslation();
  const columnWidth = getColumnWidth();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');

  const budgeted =
    budgetType === 'tracking'
      ? trackingBudget.catBudgeted(category.id)
      : envelopeBudget.catBudgeted(category.id);

  const balance =
    budgetType === 'tracking'
      ? trackingBudget.catSumAmount(category.id)
      : envelopeBudget.catSumAmount(category.id);

  if (showTotal) {
    const bindings =
      budgetType === 'tracking' ? trackingBudget : envelopeBudget;
    return (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        {budgetType === 'tracking' && (
          <TotalCell
            categoryId={category.id}
            month={month}
            binding={bindings.catBudgetedTotal(category.id)}
            width={columnWidth}
          />
        )}
        <TotalCell
          categoryId={category.id}
          month={month}
          binding={bindings.catSumAmountTotal(category.id)}
          width={columnWidth}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
      }}
    >
      {budgetType === 'tracking' && (
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
            currencyCode={currencyCode}
            month={month}
            onBudgetAction={onBudgetAction}
          />
        </View>
      )}

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
          onPress={onPress}
          aria-label={
            budgetType === 'envelope'
              ? t('Open balance menu for {{categoryName}} category', {
                  categoryName: category.name,
                })
              : t('Show transactions for {{categoryName}} category', {
                  categoryName: category.name,
                })
          }
        />
      </View>
    </View>
  );
}

type IncomeCategoryListItemProps = ComponentPropsWithoutRef<
  typeof GridListItem<CategoryEntity>
> & {
  month: string;
  onEdit: (id: CategoryEntity['id']) => void;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
};

export function IncomeCategoryListItem({
  month,
  onEdit,
  onBudgetAction,
  ...props
}: IncomeCategoryListItemProps) {
  const { value: category } = props;
  // A category received in several currencies shows its total, then a row
  // per currency that has something in the month
  const { lines, probes } = useShownCategoryLines(category?.id, month);
  const navigate = useNavigate();

  const onShowActivity = useCallback(() => {
    if (!category) {
      return null;
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
        <IncomeCategoryRow
          category={category}
          month={month}
          showTotal={lines.length > 0}
          onEdit={onEdit}
          onBudgetAction={onBudgetAction}
          onShowActivity={onShowActivity}
        />
        {lines.map(line => (
          <IncomeCategoryRow
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
            onBudgetAction={onBudgetAction}
            onShowActivity={onShowActivity}
          />
        ))}
      </View>
    </GridListItem>
  );
}

type IncomeCategoryRowProps = {
  // The category, or one of its currency lines named after it
  category: CategoryEntity;
  // Shown instead of the name of a line of the category
  label?: string;
  currencyCode?: string;
  showTotal?: boolean;
  // A currency line before its first month
  isEmpty?: boolean;
  month: string;
  onEdit?: (id: CategoryEntity['id']) => void;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
  onShowActivity: () => void;
};

function IncomeCategoryRow({
  category,
  label,
  currencyCode,
  showTotal = false,
  isEmpty = false,
  month,
  onEdit,
  onBudgetAction,
  onShowActivity,
}: IncomeCategoryRowProps) {
  const dispatch = useDispatch();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const balanceMenuModalName = `envelope-income-balance-menu`;

  const onCarryover = useCallback(
    (carryover: boolean) => {
      onBudgetAction(month, 'carryover', {
        category: category.id,
        flag: carryover,
      });
    },
    [category, onBudgetAction, month],
  );

  const onOpenBalanceMenu = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: balanceMenuModalName,
          options: {
            month,
            categoryId: category.id,
            onCarryover,
            onShowActivity,
          },
        },
      }),
    );
  }, [
    category,
    balanceMenuModalName,
    dispatch,
    month,
    onShowActivity,
    onCarryover,
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
        opacity: category.hidden ? 0.5 : undefined,
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
        <IncomeCategoryName
          category={category}
          month={month}
          onEdit={id => onEdit?.(id)}
        />
      )}
      {!isEmpty && (
        <IncomeCategoryCells
          key={`${category.id}`}
          category={category}
          currencyCode={currencyCode}
          showTotal={showTotal}
          month={month}
          onBudgetAction={onBudgetAction}
          onPress={
            budgetType === 'envelope' ? onOpenBalanceMenu : onShowActivity
          }
        />
      )}
    </View>
  );
}
