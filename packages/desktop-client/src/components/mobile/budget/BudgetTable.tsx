import React, { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';
import { AutoTextSize } from 'auto-text-size';

import { MOBILE_NAV_HEIGHT } from '#components/mobile/MobileNavTabs';
import { PullToRefresh } from '#components/mobile/PullToRefresh';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { CellValue } from '#components/spreadsheet/CellValue';
import { SchedulesProvider } from '#hooks/useCachedSchedules';
import { useFormat } from '#hooks/useFormat';
import { useLocalPref } from '#hooks/useLocalPref';
import { useSheetValue } from '#hooks/useSheetValue';
import { useSyncedPref } from '#hooks/useSyncedPref';
import type { Binding } from '#spreadsheet';
import { envelopeBudget, trackingBudget } from '#spreadsheet/bindings';

import {
  AMOUNT_TEXT_STYLE,
  AMOUNT_WRAPPER_STYLE,
  CELL_BUTTON_STYLE,
  COLUMN_HEADING_STYLE,
  getRowGridStyle,
  LABEL_STYLE,
  ROW_PADDING_X,
} from './budgetTableStyles';
import { ExpenseGroupList } from './ExpenseGroupList';
import { IncomeGroup } from './IncomeGroup';
import { useReorderMode } from './ReorderModeContext';

type ToBudgetProps = {
  toBudget: Binding<'envelope-budget', 'to-budget'>;
  onPress: () => void;
};

function ToBudget({ toBudget, onPress }: ToBudgetProps) {
  const { t } = useTranslation();
  const amount = useSheetValue(toBudget) ?? 0;

  return (
    <SummaryHeadline
      label={amount < 0 ? t('Overbudgeted') : t('To Budget')}
      amount={amount}
      color={
        amount < 0
          ? theme.toBudgetNegative
          : amount > 0
            ? theme.toBudgetPositive
            : theme.toBudgetZero
      }
      onPress={onPress}
    />
  );
}

type SavedProps = {
  projected: boolean;
  onPress: () => void;
};

function Saved({ projected, onPress }: SavedProps) {
  const { t } = useTranslation();
  const binding = projected
    ? trackingBudget.totalBudgetedSaved
    : trackingBudget.totalSaved;

  const saved = useSheetValue<'tracking-budget', typeof binding>(binding) || 0;
  const isNegative = saved < 0;

  return (
    <SummaryHeadline
      label={
        projected
          ? t('Projected savings')
          : isNegative
            ? t('Overspent')
            : t('Saved')
      }
      amount={saved}
      color={
        projected
          ? theme.warningText
          : isNegative
            ? theme.errorTextDark
            : theme.pageTextPositive
      }
      onPress={onPress}
    />
  );
}

type SummaryHeadlineProps = {
  label: ReactNode;
  amount: number;
  color: string;
  onPress: () => void;
};

function SummaryHeadline({
  label,
  amount,
  color,
  onPress,
}: SummaryHeadlineProps) {
  const format = useFormat();

  return (
    <Button
      variant="bare"
      onPress={onPress}
      style={{ padding: 0, minWidth: 0, flexShrink: 1 }}
    >
      <View style={{ alignItems: 'flex-start', minWidth: 0 }}>
        <Text
          style={{ ...LABEL_STYLE, ...styles.ellipsisText, maxWidth: '100%' }}
        >
          {label}
        </Text>
        <View style={{ ...AMOUNT_WRAPPER_STYLE, justifyContent: 'flex-start' }}>
          <PrivacyFilter>
            <AutoTextSize
              key={amount}
              as={Text}
              minFontSizePx={12}
              maxFontSizePx={20}
              mode="oneline"
              style={{
                ...styles.tnum,
                ...styles.largeText,
                letterSpacing: -0.4,
                color,
              }}
            >
              {format(amount, 'financial')}
            </AutoTextSize>
          </PrivacyFilter>
        </View>
      </View>
    </Button>
  );
}

type SummaryTotalProps = {
  label: ReactNode;
  binding: Binding<
    'envelope-budget' | 'tracking-budget',
    'total-budgeted' | 'total-spent' | 'total-leftover'
  >;
  negate?: boolean;
};

function SummaryTotal({ label, binding, negate = false }: SummaryTotalProps) {
  const format = useFormat();

  return (
    <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
      <Text style={{ ...styles.verySmallText, color: theme.pageTextLight }}>
        {label}
      </Text>
      <CellValue binding={binding} type="financial">
        {({ type, value }) => (
          <PrivacyFilter>
            <Text
              style={{
                ...AMOUNT_TEXT_STYLE,
                fontWeight: 600,
                color: theme.pageTextDark,
              }}
            >
              {format(negate ? -value : value, type)}
            </Text>
          </PrivacyFilter>
        )}
      </CellValue>
    </View>
  );
}

type BudgetGroupsProps = {
  categoryGroups: CategoryGroupEntity[];
  onShowCategoryGroup: (id: CategoryGroupEntity['id']) => void;
  onShowCategory: (id: CategoryEntity['id']) => void;
  month: string;
  showBudgetedColumn: boolean;
  show3Columns: boolean;
  showHiddenCategories: boolean;
};

function BudgetGroups({
  categoryGroups,
  onShowCategoryGroup,
  onShowCategory,
  month,
  showBudgetedColumn,
  show3Columns,
  showHiddenCategories,
}: BudgetGroupsProps) {
  const { incomeGroup, expenseGroups } = useMemo(() => {
    const categoryGroupsToDisplay = categoryGroups.filter(
      group => !group.hidden || showHiddenCategories,
    );
    return {
      incomeGroup: categoryGroupsToDisplay.find(group => group.is_income),
      expenseGroups: categoryGroupsToDisplay.filter(group => !group.is_income),
    };
  }, [categoryGroups, showHiddenCategories]);

  const [collapsedGroupIds = [], setCollapsedGroupIdsPref] =
    useLocalPref('budget.collapsed');

  const onToggleCollapse = useCallback(
    (id: CategoryGroupEntity['id']) => {
      setCollapsedGroupIdsPref(
        collapsedGroupIds.includes(id)
          ? collapsedGroupIds.filter(collapsedId => collapsedId !== id)
          : [...collapsedGroupIds, id],
      );
    },
    [collapsedGroupIds, setCollapsedGroupIdsPref],
  );

  const isCollapsed = useCallback(
    (id: CategoryGroupEntity['id']) => {
      return collapsedGroupIds.includes(id);
    },
    [collapsedGroupIds],
  );

  return (
    <View
      data-testid="budget-groups"
      style={{ flex: '1 0 auto', paddingBottom: spacing.lg }}
    >
      <ExpenseGroupList
        categoryGroups={expenseGroups}
        showBudgetedColumn={showBudgetedColumn}
        month={month}
        onShowCategoryGroup={onShowCategoryGroup}
        onShowCategory={onShowCategory}
        show3Columns={show3Columns}
        showHiddenCategories={showHiddenCategories}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
      />

      {incomeGroup && (
        <IncomeGroup
          categoryGroup={incomeGroup}
          month={month}
          showHiddenCategories={showHiddenCategories}
          onShowCategoryGroup={onShowCategoryGroup}
          onShowCategory={onShowCategory}
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />
      )}
    </View>
  );
}

type BudgetTableProps = {
  categoryGroups: CategoryGroupEntity[];
  month: string;
  onShowBudgetSummary: () => void;
  onRefresh: () => Promise<void>;
  onShowCategoryGroup: (id: CategoryGroupEntity['id']) => void;
  onShowCategory: (id: CategoryEntity['id']) => void;
};

export function BudgetTable({
  categoryGroups,
  month,
  onShowBudgetSummary,
  onRefresh,
  onShowCategoryGroup,
  onShowCategory,
}: BudgetTableProps) {
  const { width } = useResponsive();
  const show3Columns = width >= 300;
  const isReordering = useReorderMode();

  const [showSpentColumn = false, setShowSpentColumnPref] = useLocalPref(
    'mobile.showSpentColumn',
  );

  function toggleSpentColumn() {
    setShowSpentColumnPref(!showSpentColumn);
  }

  const [showHiddenCategories = false] = useLocalPref(
    'budget.showHiddenCategories',
  );

  const schedulesQuery = useMemo(() => q('schedules').select('*'), []);

  return (
    <>
      <BudgetTableHeader
        month={month}
        show3Columns={show3Columns}
        showSpentColumn={showSpentColumn}
        toggleSpentColumn={toggleSpentColumn}
        onShowBudgetSummary={onShowBudgetSummary}
      />
      <PullToRefresh onRefresh={onRefresh} isPullable={!isReordering}>
        <View
          data-testid="budget-table"
          style={{
            backgroundColor: theme.tableBackground,
            minHeight: '100vh',
            paddingBottom: MOBILE_NAV_HEIGHT,
          }}
        >
          <SchedulesProvider query={schedulesQuery}>
            <BudgetGroups
              categoryGroups={categoryGroups}
              showBudgetedColumn={!showSpentColumn}
              show3Columns={show3Columns}
              showHiddenCategories={showHiddenCategories}
              month={month}
              onShowCategoryGroup={onShowCategoryGroup}
              onShowCategory={onShowCategory}
            />
          </SchedulesProvider>
        </View>
      </PullToRefresh>
    </>
  );
}

type BudgetTableHeaderProps = {
  show3Columns: boolean;
  month: string;
  onShowBudgetSummary: () => void;
  showSpentColumn: boolean;
  toggleSpentColumn: () => void;
};

function BudgetTableHeader({
  show3Columns,
  month,
  onShowBudgetSummary,
  showSpentColumn,
  toggleSpentColumn,
}: BudgetTableHeaderProps) {
  const { t } = useTranslation();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const isTracking = budgetType === 'tracking';
  const showBudgeted = show3Columns || !showSpentColumn;
  const showSpent = show3Columns || showSpentColumn;

  return (
    <View
      data-testid="budget-table-header"
      style={{
        flexShrink: 0,
        backgroundColor: theme.tableBackground,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: ROW_PADDING_X,
          padding: `${spacing.sm}px ${ROW_PADDING_X}px`,
          borderBottomWidth: 1,
          borderColor: theme.tableBorder,
        }}
      >
        {isTracking ? (
          <Saved
            projected={month >= monthUtils.currentMonth()}
            onPress={onShowBudgetSummary}
          />
        ) : (
          <ToBudget
            toBudget={envelopeBudget.toBudget}
            onPress={onShowBudgetSummary}
          />
        )}
        <View style={{ flex: 1 }} />
        {showBudgeted && (
          <SummaryTotal
            label={t('Budgeted')}
            binding={
              isTracking
                ? trackingBudget.totalBudgetedExpense
                : envelopeBudget.totalBudgeted
            }
            negate={!isTracking}
          />
        )}
        {showSpent && (
          <SummaryTotal
            label={t('Spent')}
            binding={
              isTracking ? trackingBudget.totalSpent : envelopeBudget.totalSpent
            }
          />
        )}
        <SummaryTotal
          label={t('Balance')}
          binding={
            isTracking
              ? trackingBudget.totalLeftover
              : envelopeBudget.totalBalance
          }
        />
      </View>

      <View
        style={{
          ...getRowGridStyle(show3Columns ? 2 : 1),
          paddingTop: spacing.xs,
          paddingBottom: spacing.xs,
          borderBottomWidth: 1,
          borderColor: theme.tableBorder,
        }}
      >
        <Text style={COLUMN_HEADING_STYLE}>
          <Trans>Category</Trans>
        </Text>
        {show3Columns ? (
          <>
            <Text style={{ ...COLUMN_HEADING_STYLE, textAlign: 'right' }}>
              <Trans>Budgeted</Trans>
            </Text>
            <Text style={{ ...COLUMN_HEADING_STYLE, textAlign: 'right' }}>
              <Trans>Spent</Trans>
            </Text>
          </>
        ) : (
          <Button
            variant="bare"
            onPress={toggleSpentColumn}
            style={{
              ...CELL_BUTTON_STYLE,
              ...COLUMN_HEADING_STYLE,
              textAlign: 'right',
            }}
          >
            {showSpentColumn ? <Trans>Spent</Trans> : <Trans>Budgeted</Trans>}
          </Button>
        )}
        <Text style={{ ...COLUMN_HEADING_STYLE, textAlign: 'right' }}>
          <Trans>Balance</Trans>
        </Text>
      </View>
    </View>
  );
}
