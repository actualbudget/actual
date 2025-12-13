import React, { useCallback, useMemo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgCheveronRight } from '@actual-app/components/icons/v1';
import { SvgViewShow } from '@actual-app/components/icons/v2';
import { Label } from '@actual-app/components/label';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { AutoTextSize } from 'auto-text-size';

import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';

import { ExpenseGroupList } from './ExpenseGroupList';
import { IncomeGroup } from './IncomeGroup';

import { MOBILE_NAV_HEIGHT } from '@desktop-client/components/mobile/MobileNavTabs';
import { PullToRefresh } from '@desktop-client/components/mobile/PullToRefresh';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { CellValue } from '@desktop-client/components/spreadsheet/CellValue';
import { SchedulesProvider } from '@desktop-client/hooks/useCachedSchedules';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';
import { useSheetValue } from '@desktop-client/hooks/useSheetValue';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { type Binding } from '@desktop-client/spreadsheet';
import {
  envelopeBudget,
  trackingBudget,
} from '@desktop-client/spreadsheet/bindings';

export const ROW_HEIGHT = 50;

export const PILL_STYLE: CSSProperties = {
  borderRadius: 16,
  color: theme.pillText,
  backgroundColor: theme.pillBackgroundLight,
};

export function getColumnWidth({
  show3Columns = false,
  isSidebar = false,
  offset = 0,
}: {
  show3Columns?: boolean;
  isSidebar?: boolean;
  offset?: number;
} = {}) {
  // If show3Columns = 35vw | 20vw | 20vw | 20vw,
  // Else = 45vw | 25vw | 25vw,
  if (!isSidebar) {
    return show3Columns ? `${20 + offset}vw` : `${25 + offset}vw`;
  }
  return show3Columns ? `${35 + offset}vw` : `${45 + offset}vw`;
}

type ToBudgetProps = {
  toBudget: Binding<'envelope-budget', 'to-budget'>;
  onPress: () => void;
  show3Columns: boolean;
};

function ToBudget({ toBudget, onPress, show3Columns }: ToBudgetProps) {
  const { t } = useTranslation();
  const amount = useSheetValue(toBudget) ?? 0;
  const format = useFormat();
  const sidebarColumnWidth = getColumnWidth({ show3Columns, isSidebar: true });

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        width: sidebarColumnWidth,
      }}
    >
      <Button variant="bare" onPress={onPress}>
        <View>
          <View>
            <AutoTextSize
              as={Label}
              minFontSizePx={6}
              maxFontSizePx={12}
              mode="oneline"
              title={amount < 0 ? t('Overbudgeted') : t('To Budget')}
              style={{
                ...(amount < 0 ? styles.smallText : {}),
                color: theme.formInputText,
                flexShrink: 0,
                textAlign: 'left',
              }}
            />
          </View>
          <CellValue binding={toBudget} type="financial">
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
                      fontSize: 12,
                      fontWeight: '700',
                      color:
                        amount < 0
                          ? theme.errorText
                          : amount > 0
                            ? theme.noticeText
                            : theme.formInputText,
                    }}
                  >
                    {format(value, type)}
                  </AutoTextSize>
                </PrivacyFilter>
              </View>
            )}
          </CellValue>
        </View>
        <SvgCheveronRight
          style={{
            flexShrink: 0,
            color: theme.mobileHeaderTextSubdued,
            marginLeft: 5,
          }}
          width={14}
          height={14}
        />
      </Button>
    </View>
  );
}

type SavedProps = {
  projected: boolean;
  onPress: () => void;
  show3Columns: boolean;
};

function Saved({ projected, onPress, show3Columns }: SavedProps) {
  const { t } = useTranslation();
  const binding = projected
    ? trackingBudget.totalBudgetedSaved
    : trackingBudget.totalSaved;

  const saved = useSheetValue<'tracking-budget', typeof binding>(binding) || 0;
  const format = useFormat();
  const isNegative = saved < 0;
  const sidebarColumnWidth = getColumnWidth({ show3Columns, isSidebar: true });

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        width: sidebarColumnWidth,
      }}
    >
      <Button variant="bare" onPress={onPress}>
        <View style={{ alignItems: 'flex-start' }}>
          {projected ? (
            <View>
              <AutoTextSize
                as={Label}
                minFontSizePx={6}
                maxFontSizePx={12}
                mode="oneline"
                title={t('Projected savings')}
                style={{
                  color: theme.formInputText,
                  textAlign: 'left',
                  fontSize: 12,
                }}
              />
            </View>
          ) : (
            <Label
              title={isNegative ? t('Overspent') : t('Saved')}
              style={{
                color: theme.formInputText,
                textAlign: 'left',
              }}
            />
          )}

          <CellValue<'tracking-budget', typeof binding>
            binding={binding}
            type="financial"
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
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: '700',
                      color: projected
                        ? theme.warningText
                        : isNegative
                          ? theme.errorTextDark
                          : theme.formInputText,
                    }}
                  >
                    {format(value, type)}
                  </AutoTextSize>
                </PrivacyFilter>
              </View>
            )}
          </CellValue>
        </View>
        <SvgCheveronRight
          style={{
            flexShrink: 0,
            color: theme.mobileHeaderTextSubdued,
            marginLeft: 5,
          }}
          width={14}
          height={14}
        />
      </Button>
    </View>
  );
}

type BudgetGroupsProps = {
  type: string;
  categoryGroups: CategoryGroupEntity[];
  onEditCategoryGroup: (id: CategoryGroupEntity['id']) => void;
  onEditCategory: (id: CategoryEntity['id']) => void;
  month: string;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
  showBudgetedColumn: boolean;
  show3Columns: boolean;
  showHiddenCategories: boolean;
};

function BudgetGroups({
  categoryGroups,
  onEditCategoryGroup,
  onEditCategory,
  month,
  onBudgetAction,
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
      style={{ flex: '1 0 auto', overflowY: 'auto', paddingBottom: 15 }}
    >
      <ExpenseGroupList
        categoryGroups={expenseGroups}
        showBudgetedColumn={showBudgetedColumn}
        month={month}
        onEditCategoryGroup={onEditCategoryGroup}
        onEditCategory={onEditCategory}
        onBudgetAction={onBudgetAction}
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
          onEditCategoryGroup={onEditCategoryGroup}
          onEditCategory={onEditCategory}
          onBudgetAction={onBudgetAction}
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
  onBudgetAction: (month: string, action: string, args: unknown) => void;
  onRefresh: () => Promise<void>;
  onEditCategoryGroup: (id: CategoryGroupEntity['id']) => void;
  onEditCategory: (id: CategoryEntity['id']) => void;
};

export function BudgetTable({
  categoryGroups,
  month,
  onShowBudgetSummary,
  onBudgetAction,
  onRefresh,
  onEditCategoryGroup,
  onEditCategory,
}: BudgetTableProps) {
  const { width } = useResponsive();
  const show3Columns = width >= 300;

  // let editMode = false; // neuter editMode -- sorry, not rewriting drag-n-drop right now

  const [showSpentColumn = false, setShowSpentColumnPref] = useLocalPref(
    'mobile.showSpentColumn',
  );

  function toggleSpentColumn() {
    setShowSpentColumnPref(!showSpentColumn);
  }

  const [showHiddenCategories = false] = useLocalPref(
    'budget.showHiddenCategories',
  );

  const [budgetType = 'envelope'] = useSyncedPref('budgetType');

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
      <PullToRefresh onRefresh={onRefresh}>
        <View
          data-testid="budget-table"
          style={{
            backgroundColor: theme.pageBackground,
            minHeight: '100vh',
            paddingBottom: MOBILE_NAV_HEIGHT,
          }}
        >
          <SchedulesProvider query={schedulesQuery}>
            <BudgetGroups
              type={budgetType}
              categoryGroups={categoryGroups}
              showBudgetedColumn={!showSpentColumn}
              show3Columns={show3Columns}
              showHiddenCategories={showHiddenCategories}
              month={month}
              onEditCategoryGroup={onEditCategoryGroup}
              onEditCategory={onEditCategory}
              onBudgetAction={onBudgetAction}
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
  const format = useFormat();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const buttonStyle = {
    padding: 0,
    backgroundColor: 'transparent',
    borderRadius: 'unset',
  };
  const sidebarColumnWidth = getColumnWidth({ show3Columns, isSidebar: true });
  const columnWidth = getColumnWidth({ show3Columns });

  const amountStyle: CSSProperties = {
    color: theme.formInputText,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '500',
  };

  return (
    <View
      data-testid="budget-table-header"
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        padding: '10px 15px',
        paddingLeft: 10,
        backgroundColor: monthUtils.isCurrentMonth(month)
          ? theme.budgetHeaderCurrentMonth
          : theme.budgetHeaderOtherMonth,
        borderBottomWidth: 1,
        borderColor: theme.tableBorder,
      }}
    >
      <View
        style={{
          width: sidebarColumnWidth,
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center',
        }}
      >
        {budgetType === 'tracking' ? (
          <Saved
            projected={month >= monthUtils.currentMonth()}
            onPress={onShowBudgetSummary}
            show3Columns={show3Columns}
          />
        ) : (
          <ToBudget
            toBudget={envelopeBudget.toBudget}
            onPress={onShowBudgetSummary}
            show3Columns={show3Columns}
          />
        )}
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        {(show3Columns || !showSpentColumn) && (
          <CellValue<'envelope-budget' | 'tracking-budget', 'total-budgeted'>
            binding={
              budgetType === 'tracking'
                ? trackingBudget.totalBudgetedExpense
                : envelopeBudget.totalBudgeted
            }
            type="financial"
          >
            {({ type: formatType, value }) => (
              <Button
                variant="bare"
                isDisabled={show3Columns}
                onPress={toggleSpentColumn}
                style={{
                  ...buttonStyle,
                  width: columnWidth,
                }}
              >
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {!show3Columns && (
                      <SvgViewShow
                        width={12}
                        height={12}
                        style={{
                          flexShrink: 0,
                          color: theme.pageTextSubdued,
                          marginRight: 5,
                        }}
                      />
                    )}
                    <View>
                      <AutoTextSize
                        as={Label}
                        minFontSizePx={8}
                        maxFontSizePx={12}
                        mode="multiline"
                        title={t('Budgeted')}
                        style={{ color: theme.formInputText, paddingRight: 4 }}
                      />
                    </View>
                  </View>
                  <View>
                    <PrivacyFilter>
                      <AutoTextSize
                        key={value}
                        as={Text}
                        minFontSizePx={6}
                        maxFontSizePx={12}
                        mode="oneline"
                        style={{
                          ...amountStyle,
                          paddingRight: 4,
                        }}
                      >
                        {format(
                          budgetType === 'tracking' ? value : -value,
                          formatType,
                        )}
                      </AutoTextSize>
                    </PrivacyFilter>
                  </View>
                </View>
              </Button>
            )}
          </CellValue>
        )}
        {(show3Columns || showSpentColumn) && (
          <CellValue<'envelope-budget' | 'tracking-budget', 'total-spent'>
            binding={
              budgetType === 'tracking'
                ? trackingBudget.totalSpent
                : envelopeBudget.totalSpent
            }
            type="financial"
          >
            {({ type, value }) => (
              <Button
                variant="bare"
                isDisabled={show3Columns}
                onPress={toggleSpentColumn}
                style={{
                  ...buttonStyle,
                  width: columnWidth,
                }}
              >
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {!show3Columns && (
                      <SvgViewShow
                        width={12}
                        height={12}
                        style={{
                          flexShrink: 0,
                          color: theme.pageTextSubdued,
                          marginRight: 5,
                        }}
                      />
                    )}
                    <View>
                      <AutoTextSize
                        as={Label}
                        minFontSizePx={6}
                        maxFontSizePx={12}
                        mode="oneline"
                        title={t('Spent')}
                        style={{ color: theme.formInputText, paddingRight: 4 }}
                      />
                    </View>
                  </View>
                  <View>
                    <PrivacyFilter>
                      <AutoTextSize
                        key={value}
                        as={Text}
                        minFontSizePx={6}
                        maxFontSizePx={12}
                        mode="oneline"
                        style={{
                          ...amountStyle,
                          paddingRight: 4,
                        }}
                      >
                        {format(value, type)}
                      </AutoTextSize>
                    </PrivacyFilter>
                  </View>
                </View>
              </Button>
            )}
          </CellValue>
        )}
        <CellValue<'envelope-budget' | 'tracking-budget', 'total-leftover'>
          binding={
            budgetType === 'tracking'
              ? trackingBudget.totalLeftover
              : envelopeBudget.totalBalance
          }
          type="financial"
        >
          {({ type, value }) => (
            <View style={{ width: columnWidth }}>
              <View style={{ flex: 1, alignItems: 'flex-end !important' }}>
                <View>
                  <AutoTextSize
                    as={Label}
                    minFontSizePx={6}
                    maxFontSizePx={12}
                    mode="oneline"
                    title={t('Balance')}
                    style={{ color: theme.formInputText }}
                  />
                </View>
                <View>
                  <PrivacyFilter>
                    <AutoTextSize
                      key={value}
                      as={Text}
                      minFontSizePx={6}
                      maxFontSizePx={12}
                      mode="oneline"
                      style={amountStyle}
                    >
                      {format(value, type)}
                    </AutoTextSize>
                  </PrivacyFilter>
                </View>
              </View>
            </View>
          )}
        </CellValue>
      </View>
    </View>
  );
}
